"""
Voice Assistant Tests
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from companies.models import Company
from voice.models import (
    VoiceSession, VoiceCommand, FishNameAlias
)
from voice.services.nlp_engine import EntityExtractor, ClarificationEngine
from voice.services.fish_normalizer import FishNormalizer
import io

User = get_user_model()


class VoiceSessionAPITestCase(APITestCase):
    """Test voice session API endpoints"""

    def setUp(self):
        """Set up test user and company"""
        self.company = Company.objects.create(name='Test Company')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            company=self.company
        )
        
        # Generate JWT token
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)
        
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_create_voice_session(self):
        """Test creating a new voice session"""
        response = self.client.post('/api/voice/sessions/', {
            'language': 'tamil'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['language'], 'tamil')
        self.assertEqual(response.data['status'], 'active')

    def test_get_active_session(self):
        """Test getting active session"""
        # Create a session first
        self.client.post('/api/voice/sessions/', {'language': 'tamil'})
        
        response = self.client.get('/api/voice/sessions/active_session/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['language'], 'tamil')

    def test_end_session(self):
        """Test ending a session"""
        # Create session
        create_response = self.client.post('/api/voice/sessions/', {'language': 'tamil'})
        session_id = create_response.data['id']
        
        # End session
        response = self.client.post(f'/api/voice/sessions/{session_id}/end_session/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'completed')

    def test_list_sessions(self):
        """Test listing user sessions"""
        # Create multiple sessions
        self.client.post('/api/voice/sessions/', {'language': 'tamil'})
        self.client.post('/api/voice/sessions/', {'language': 'english'})
        
        response = self.client.get('/api/voice/sessions/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)


class EntityExtractionTestCase(TestCase):
    """Test NLP entity extraction"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(name='Test Company')
        self.extractor = EntityExtractor(self.company.id)
        
        # Add some fish aliases
        FishNameAlias.objects.create(
            company=self.company,
            normalized_name='Vanjaram',
            english_name='Seer Fish',
            tamil_name='வஞ்சரம்',
            aliases=['வஞ்சரம்', 'vanjaram', 'seer fish', 'vanjiram']
        )

    def test_extract_basic_purchase(self):
        """Test extracting entities from basic purchase command"""
        text = "20 box vanjaram വാങ്കിന്ന് 420 rate"
        
        result = self.extractor.extract_entities(text, 'tanglish')
        
        self.assertIsNotNone(result['entities'].get('quantity_boxes'))
        self.assertIsNotNone(result['entities'].get('price_per_kg'))

    def test_extract_with_costs(self):
        """Test extracting costs"""
        text = "20 box vanjaram rate 420 ice 1000 transport 500"
        
        result = self.extractor.extract_entities(text)
        
        self.assertEqual(result['entities'].get('quantity_boxes'), 20)
        self.assertEqual(result['entities'].get('price_per_kg'), 420)
        self.assertEqual(result['entities'].get('ice_cost'), 1000)
        self.assertEqual(result['entities'].get('transport_cost'), 500)

    def test_extract_weight(self):
        """Test weight extraction"""
        text = "37 kg വഞ്ജരം"
        
        result = self.extractor.extract_entities(text)
        
        self.assertEqual(result['entities'].get('weight_kg'), 37.0)

    def test_missing_required_fields_detection(self):
        """Test detecting missing required fields"""
        entities = {
            'fish_name': 'Vanjaram',
            'quantity_boxes': 20,
        }
        
        missing = ClarificationEngine.get_missing_required_fields(
            entities,
            'purchase'
        )
        
        self.assertIn('price_per_kg', missing)

    def test_low_confidence_detection(self):
        """Test detecting low confidence fields"""
        entities = {
            'fish_name': 'Vanjaram',
            'quantity_boxes': 20,
            'transport_cost': 500
        }
        
        confidence_scores = {
            'fish_name': 0.95,
            'quantity_boxes': 0.9,
            'transport_cost': 0.4  # Low confidence
        }
        
        low_conf = ClarificationEngine.get_low_confidence_fields(
            entities,
            confidence_scores,
            threshold=0.7
        )
        
        self.assertIn('transport_cost', low_conf)


class FishNormalizerTestCase(TestCase):
    """Test fish name normalization"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(name='Test Company')
        self.normalizer = FishNormalizer(self.company.id)
        
        # Add test alias
        FishNameAlias.objects.create(
            company=self.company,
            normalized_name='Vanjaram',
            english_name='Seer Fish',
            tamil_name='வஞ்சരம்',
            aliases=['வஞ்சரம்', 'vanjaram', 'seer fish', 'vanjiram', 'vancharam']
        )

    def test_exact_match(self):
        """Test exact fish name matching"""
        normalized, conf, _ = self.normalizer.normalize('vanjaram')
        
        self.assertEqual(normalized, 'Vanjaram')
        self.assertEqual(conf, 1.0)

    def test_fuzzy_match(self):
        """Test fuzzy matching"""
        normalized, conf, _ = self.normalizer.normalize('vanjiram')
        
        self.assertEqual(normalized, 'Vanjaram')
        self.assertGreater(conf, 0.7)

    def test_tamil_match(self):
        """Test Tamil script matching"""
        normalized, conf, _ = self.normalizer.normalize('வஞ்சரம்')
        
        self.assertEqual(normalized, 'Vanjaram')
        self.assertGreater(conf, 0.7)

    def test_unrecognized_fish(self):
        """Test unrecognized fish name"""
        normalized, conf, _ = self.normalizer.normalize('xyz123')
        
        self.assertIsNone(normalized)
        self.assertEqual(conf, 0.0)

    def test_add_alias(self):
        """Test adding a new alias"""
        self.normalizer.add_alias(
            'Mathi',
            ['mathi', 'sardine'],
            'Sardine',
            'மத்தி'
        )
        
        # Verify new alias works
        normalized, _, _ = self.normalizer.normalize('mathi')
        self.assertEqual(normalized, 'Mathi')

    def test_tanglish_detection(self):
        """Test Tanglish detection"""
        is_tanglish = FishNormalizer.is_tanglish('vanjaram')
        self.assertTrue(is_tanglish)
        
        is_tanglish = FishNormalizer.is_tanglish('வஞ்சരம്')
        self.assertFalse(is_tanglish)


class VoiceCommandProcessingTestCase(APITestCase):
    """Test voice command processing"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(name='Test Company')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            company=self.company
        )
        
        # Generate JWT token
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)
        
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        
        # Create a session
        response = self.client.post('/api/voice/sessions/', {'language': 'tamil'})
        self.session_id = response.data['id']
        
        # Add fish alias
        FishNameAlias.objects.create(
            company=self.company,
            normalized_name='Vanjaram',
            english_name='Seer Fish',
            tamil_name='வஞ്சരം',
            aliases=['വഞ്ചരം', 'vanjaram']
        )

    def create_test_audio(self):
        """Create a mock audio file"""
        audio_data = b'RIFF' + b'\x00' * 100  # Mock WAV header
        return io.BytesIO(audio_data)

    def test_process_voice_command_requires_session(self):
        """Test that processing requires valid session"""
        audio_file = self.create_test_audio()
        
        # Try to process without session_id
        response = self.client.post(
            '/api/voice/commands/process/',
            {
                'audio_file': audio_file
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, 400)

    def test_voice_command_workflow(self):
        """Test complete voice command workflow"""
        # Note: This test will fail without a real speech provider configured
        # In CI/CD, mock the provider response
        pass


class VoiceSettingsAPITestCase(APITestCase):
    """Test voice settings API"""

    def setUp(self):
        """Set up test user"""
        self.company = Company.objects.create(name='Test Company')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            company=self.company
        )
        
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)
        
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_retrieve_default_settings(self):
        """Test retrieving default voice settings"""
        response = self.client.get('/api/voice/settings/retrieve_settings/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['primary_language'], 'tamil')

    def test_update_settings(self):
        """Test updating voice settings"""
        response = self.client.post(
            '/api/voice/settings/update_settings/',
            {
                'primary_language': 'english',
                'voice_speed': 1.5
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['primary_language'], 'english')
        self.assertEqual(response.data['voice_speed'], 1.5)


class VoiceAnalyticsTestCase(TestCase):
    """Test voice analytics"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(name='Test Company')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            company=self.company
        )

    def test_analytics_tracking(self):
        """Test that analytics are tracked"""
        # Create a session
        session = VoiceSession.objects.create(
            user=self.user,
            company=self.company,
            language='tamil'
        )
        
        # Create a successful command
        command = VoiceCommand.objects.create(
            session=session,
            status='confirmed',
            overall_confidence=0.9,
            speech_provider_cost=0.006,
            nlp_provider_cost=0.0003
        )
        
        # Check that session stats are updated
        session.refresh_from_db()
        self.assertEqual(session.total_commands, 1)
        self.assertEqual(session.successful_commands, 1)


class VoicePermissionTestCase(APITestCase):
    """Test voice permission and tenant isolation"""

    def setUp(self):
        """Set up multiple users and companies"""
        self.company1 = Company.objects.create(name='Company 1')
        self.company2 = Company.objects.create(name='Company 2')
        
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@test.com',
            password='pass123',
            company=self.company1
        )
        
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='pass123',
            company=self.company2
        )

    def test_user_cannot_access_other_company_sessions(self):
        """Test tenant isolation"""
        # Create session for user1
        session = VoiceSession.objects.create(
            user=self.user1,
            company=self.company1
        )
        
        # Try to access with user2
        refresh = RefreshToken.for_user(self.user2)
        token = str(refresh.access_token)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = client.get(f'/api/voice/sessions/{session.id}/')
        
        self.assertEqual(response.status_code, 404)


class VoiceIntegrationTestCase(TestCase):
    """Integration tests for full voice workflow"""

    def setUp(self):
        """Set up test environment"""
        self.company = Company.objects.create(name='Test Company')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            company=self.company
        )

    def test_full_voice_purchase_workflow(self):
        """Test complete purchase voice workflow"""
        # Create session
        session = VoiceSession.objects.create(
            user=self.user,
            company=self.company,
            language='tamil'
        )
        
        # Create command
        command = VoiceCommand.objects.create(
            session=session,
            transcript_raw="20 box vanjaram வாங்கினேன் 420 rate",
            form_type='purchase'
        )
        
        # Extract entities
        extractor = EntityExtractor(self.company.id)
        extraction = extractor.extract_entities(command.transcript_raw)
        
        command.extracted_entities = extraction['entities']
        command.entity_confidence_scores = extraction['confidence_scores']
        command.overall_confidence = extraction['overall_confidence']
        command.status = 'confirmed'
        command.save()
        
        # Verify extraction
        self.assertIsNotNone(command.extracted_entities.get('quantity_boxes'))


if __name__ == '__main__':
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    
    if not settings.configured:
        django.setup()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['voice'])
