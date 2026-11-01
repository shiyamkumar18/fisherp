import logging
from decimal import Decimal
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import PermissionDenied

from core.voice.models import VoiceSession, VoiceCommand, VoiceTranscript
from core.voice.services.speech_provider import SpeechProviderFactory
from core.voice.services.nlp_engine import EntityExtractor, ClarificationEngine
from core.voice.services.fish_normalizer import FishNormalizer
from services.trading.sale_service import SaleService
from business.trading.models import Payment, Supplier, Buyer, Fish, FishCategory, PurchaseBatch
from business.trading.helpers import _user_company

logger = logging.getLogger(__name__)

class VoiceService:
    @staticmethod
    def process_voice_command(user, session_id, audio_data, language='tamil', form_type='other'):
        try:
            session = VoiceSession.objects.get(id=session_id, user=user)
        except VoiceSession.DoesNotExist:
            raise DjangoValidationError("Session not found")

        command = VoiceCommand.objects.create(
            session=session,
            form_type=form_type,
            status='recording'
        )

        try:
            command.audio_size_bytes = len(audio_data)
            command.save()
            
            # Step 1: Transcribe
            command.status = 'transcribed'
            command.save()
            
            provider = SpeechProviderFactory.get_provider()
            transcription = provider.transcribe(audio_data, language)
            
            command.transcript_raw = transcription['transcript']
            command.speech_provider = transcription.get('provider', 'unknown')
            command.speech_provider_response_time_ms = transcription.get('response_time_ms', 0)
            command.speech_provider_cost = transcription.get('cost', 0)
            command.save()
            
            # Create transcript record
            VoiceTranscript.objects.create(
                command=command,
                provider=command.speech_provider,
                provider_confidence=transcription.get('confidence', 0),
                alternatives=transcription.get('alternatives', []),
                processing_time_ms=transcription.get('response_time_ms', 0),
                cost=transcription.get('cost', 0),
                language_detected=transcription.get('language', language),
            )
            
            # Step 2: Extract entities
            command.status = 'extracted'
            
            extractor = EntityExtractor(user.company_id)
            extraction = extractor.extract_entities(command.transcript_raw, language)
            
            command.extracted_entities = extraction['entities']
            command.entity_confidence_scores = extraction['confidence_scores']
            command.overall_confidence = extraction['overall_confidence']
            
            # Normalize fish name
            if command.extracted_entities.get('fish_name'):
                fish_normalizer = FishNormalizer(user.company_id)
                normalized, conf, fish_id = fish_normalizer.normalize(
                    command.extracted_entities['fish_name']
                )
                if normalized:
                    command.extracted_entities['fish_name'] = normalized
                    command.extracted_entities['fish_id'] = fish_id
                    command.entity_confidence_scores['fish_name'] = conf
                    fish_normalizer.track_usage(normalized)
            
            command.nlp_provider = 'rule_based'
            command.save()
            
            # Determine clarification and confirmation
            missing_fields = ClarificationEngine.get_missing_required_fields(
                command.extracted_entities, form_type
            )
            low_confidence_fields = ClarificationEngine.get_low_confidence_fields(
                command.extracted_entities, command.entity_confidence_scores, threshold=0.7
            )
            requires_confirmation = (
                command.overall_confidence < 0.8 or
                bool(missing_fields) or
                bool(low_confidence_fields)
            )
            
            command.status = 'confirming' if requires_confirmation else 'confirmed'
            command.save()
            
            action_intent = command.extracted_entities.get('action') or form_type
            confirmation_prompt = ClarificationEngine.generate_confirmation_prompt(
                command.extracted_entities, action_intent
            )
            
            clarification_prompt = ""
            if missing_fields:
                if 'quantity_boxes' in missing_fields or 'weight_kg' in missing_fields:
                    clarification_prompt = "Could not understand quantity. Please repeat."
                elif 'price_per_kg' in missing_fields:
                    clarification_prompt = "Could not understand the rate. Please repeat."
                elif 'fish_name' in missing_fields:
                    clarification_prompt = "Could not understand the fish name. Please repeat."
                else:
                    clarification_prompt = f"Missing {', '.join(missing_fields)}. Please clarify."
            
            return {
                'command_id': command.id,
                'transcript': command.transcript_raw,
                'transcript_cleaned': command.transcript_cleaned,
                'extracted_entities': command.extracted_entities,
                'confidence_scores': command.entity_confidence_scores,
                'overall_confidence': command.overall_confidence,
                'form_type': form_type,
                'status': command.status,
                'requires_confirmation': requires_confirmation,
                'missing_fields': missing_fields,
                'low_confidence_fields': low_confidence_fields,
                'confirmation_prompt': confirmation_prompt,
                'clarification_prompt': clarification_prompt,
            }
        except Exception as e:
            command.status = 'failed'
            command.error_message = str(e)
            command.error_type = type(e).__name__
            command.save()
            raise

    @staticmethod
    def confirm_voice_command(user, command_id, confirmed, corrections=None):
        try:
            command = VoiceCommand.objects.get(id=command_id, session__user=user)
        except VoiceCommand.DoesNotExist:
            raise DjangoValidationError("Command not found")

        if not confirmed:
            command.status = 'cancelled'
            command.save()
            return {'status': 'cancelled'}

        if corrections:
            command.extracted_entities.update(corrections)
            command.user_correction = str(corrections)

        command.status = 'confirmed'

        entities = command.extracted_entities
        action_intent = entities.get('action') or command.form_type
        company = _user_company(user)
        user_role = getattr(user, 'role', '')

        record_id = None
        if action_intent == 'purchase':
            if user_role == 'trader':
                raise PermissionDenied("Traders cannot create purchases.")

            supplier_name = entities.get('supplier_name')
            supplier, _ = Supplier.objects.get_or_create(
                company=company,
                name=supplier_name or "Walk-in Fisherman",
                defaults={'phone': ''}
            )

            fish_name = entities.get('fish_name', 'Unknown')
            category, _ = FishCategory.objects.get_or_create(name='General')
            fish, _ = Fish.objects.get_or_create(
                company=company,
                name=fish_name,
                defaults={'category': category}
            )

            purchase_data = {
                'supplier': supplier,
                'company': company,
                'tenant': user,
                'created_by': user,
                'purchase_type': 'direct',
                'fish': fish,
                'number_of_packages': int(entities.get('quantity_boxes') or 1),
                'package_weight': Decimal(str(entities.get('weight_kg') or 1)),
                'price_per_kg': Decimal(str(entities.get('price_per_kg') or 0)),
                'labour_cost': Decimal(str(entities.get('labour_cost') or 0)),
                'ice_cost': Decimal(str(entities.get('ice_cost') or 0)),
                'transport_cost': Decimal(str(entities.get('transport_cost') or 0)),
                'commission_cost': Decimal(str(entities.get('commission_cost') or 0)),
                'amount_paid': Decimal('0.00'),
            }

            from services.trading.purchase_service import PurchaseBatchService
            purchase_service = PurchaseBatchService(user)
            result = purchase_service.create_purchase_batch(purchase_data)
            record_id = result.id

        elif action_intent == 'sale':
            if user_role == 'store':
                raise PermissionDenied("Store users cannot create sales.")

            buyer_name = entities.get('buyer_name')
            buyer, _ = Buyer.objects.get_or_create(
                company=company,
                name=buyer_name or "Walk-in Customer",
                defaults={'phone': ''}
            )

            fish_name = entities.get('fish_name', 'Unknown')
            fish = Fish.objects.filter(company=company, name__icontains=fish_name).first()
            if not fish:
                raise DjangoValidationError(f"Could not find fish matching {fish_name} for sale.")

            batch = PurchaseBatch.objects.filter(
                company=company, fish=fish, status__in=['pending', 'partial', 'paid']
            ).last()
            if not batch:
                raise DjangoValidationError(f"No available stock batch found for {fish.name}.")

            sale_data = {
                'buyer': buyer,
                'company': company,
                'tenant': user,
                'batch': batch,
                'number_of_packages_sold': int(entities.get('quantity_boxes') or 1),
                'selling_weight_per_package': Decimal(str(entities.get('weight_kg') or 1)),
                'selling_price_per_kg': Decimal(str(entities.get('price_per_kg') or 0)),
            }

            sale_service = SaleService(user)
            result = sale_service.create_sale(sale_data)
            record_id = result.id

        elif action_intent == 'payment':
            if user_role in ['trader', 'store']:
                raise PermissionDenied("You do not have permission to process payments.")

            target_name = entities.get('buyer_name') or entities.get('supplier_name')
            amount_paid = Decimal(str(entities.get('amount_paid') or 0))
            payment_mode = entities.get('payment_mode') or 'cash'

            buyer = Buyer.objects.filter(company=company, name__icontains=target_name).first() if target_name else None
            supplier = Supplier.objects.filter(company=company, name__icontains=target_name).first() if target_name else None

            payment = Payment(
                company=company,
                tenant=user,
                processed_by=user,
                amount=amount_paid,
                payment_mode=payment_mode,
                status='paid'
            )

            if buyer:
                payment.buyer = buyer
                payment.payment_type = 'credit'
            elif supplier:
                payment.supplier = supplier
                payment.payment_type = 'purchase'
            else:
                raise DjangoValidationError("Could not identify the person for payment.")

            payment.save()
            record_id = payment.id

        command.status = 'saved'
        command.save()

        return {
            'command_id': command.id,
            'status': 'saved',
            'record_id': record_id,
            'entities': command.extracted_entities,
            'message': f"Successfully created {action_intent} record."
        }
