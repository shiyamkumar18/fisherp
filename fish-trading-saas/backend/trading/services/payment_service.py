from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from trading.models import Payment, JournalEntry, PaymentAuditLog
from accounts.models import User

class PaymentService:
    @staticmethod
    def _log_audit(payment, action, changed_by, changes=None, reason=""):
        if changes is None:
            changes = {}
        PaymentAuditLog.objects.create(
            payment=payment,
            action=action,
            changed_by=changed_by,
            changes=changes,
            reason=reason,
            company=payment.company
        )

    @staticmethod
    @transaction.atomic
    def update_payment(payment, validated_data, user, reason=""):
        old_values = {}
        new_values = {}

        # Can only edit if in draft, pending_approval, failed, or partially_paid
        if payment.status in ['paid', 'cancelled', 'reversed']:
            raise ValueError(f"Cannot edit payment in {payment.status} state.")

        for field, value in validated_data.items():
            old_val = getattr(payment, field, None)
            if old_val != value:
                old_values[field] = str(old_val) if old_val is not None else None
                new_values[field] = str(value) if value is not None else None
                setattr(payment, field, value)
        
        if old_values:
            payment.updated_by = user
            payment.save()
            PaymentService._log_audit(
                payment=payment,
                action='edited',
                changed_by=user,
                changes={'old': old_values, 'new': new_values},
                reason=reason or "User edited payment fields"
            )
        return payment

    @staticmethod
    @transaction.atomic
    def submit_for_approval(payment, user):
        if payment.status != 'draft':
            raise ValueError(f"Can only submit draft payments for approval.")
        
        payment.status = 'pending_approval'
        payment.submitted_for_approval_at = timezone.now()
        payment.save()
        
        PaymentService._log_audit(
            payment=payment, action='status_changed', changed_by=user, 
            changes={'status': {'old': 'draft', 'new': 'pending_approval'}},
            reason="Submitted for finance approval"
        )
        return payment

    @staticmethod
    @transaction.atomic
    def approve_payment(payment, user):
        if payment.status != 'pending_approval':
            raise ValueError(f"Payment is not pending approval.")
        
        payment.status = 'approved'
        payment.approved_at = timezone.now()
        payment.approved_by = user
        payment.save()
        
        PaymentService._log_audit(
            payment=payment, action='status_changed', changed_by=user, 
            changes={'status': {'old': 'pending_approval', 'new': 'approved'}},
            reason="Finance manager approved payment"
        )
        return payment

    @staticmethod
    @transaction.atomic
    def mark_as_paid(payment, user):
        if payment.status not in ['draft', 'approved']:
            raise ValueError(f"Cannot mark this payment as paid from status {payment.status}.")
        
        old_status = payment.status
        payment.status = 'paid'
        payment.paid_at = timezone.now()
        payment.processed_by = user
        payment.allocated_amount = payment.amount
        payment.unallocated_balance = Decimal('0.00')
        payment.save()
        
        # Post Journal Entry
        # Inbound (from Buyer -> us)
        if payment.payment_type == 'inbound':
            debit = "Cash/Bank"
            credit = "Accounts Receivable"
        else: # Outbound (from us -> Supplier)
            debit = "Accounts Payable"
            credit = "Cash/Bank"
            
        JournalEntry.objects.create(
            payment=payment,
            date=payment.date,
            account_debit=debit,
            account_credit=credit,
            amount=payment.amount,
            reference=payment.reference_number or payment.receipt_number,
            company=payment.company
        )
        
        PaymentService._log_audit(
            payment=payment, action='status_changed', changed_by=user, 
            changes={'status': {'old': old_status, 'new': 'paid'}, 'journal': 'Created'},
            reason="Payment processed and journal posted"
        )
        return payment

    @staticmethod
    @transaction.atomic
    def reverse_payment(payment, user, reason):
        if payment.status != 'paid':
            raise ValueError("Only paid payments can be reversed.")
        if not reason:
            raise ValueError("Reason is required for reversal.")
            
        payment.status = 'reversed'
        payment.save()
        
        # Reverse Journal Entry
        if payment.payment_type == 'inbound':
            debit = "Accounts Receivable"
            credit = "Cash/Bank"
        else:
            debit = "Cash/Bank"
            credit = "Accounts Payable"
            
        JournalEntry.objects.create(
            payment=payment,
            date=timezone.localdate(),
            account_debit=debit,
            account_credit=credit,
            amount=payment.amount,
            reference=f"REV-{payment.reference_number or payment.receipt_number}",
            company=payment.company
        )
        
        PaymentService._log_audit(
            payment=payment, action='reversed', changed_by=user, 
            changes={'status': {'old': 'paid', 'new': 'reversed'}, 'journal': 'Reversed'},
            reason=reason
        )
        return payment

    @staticmethod
    @transaction.atomic
    def cancel_payment(payment, user, reason):
        if payment.status in ['paid', 'reversed']:
            raise ValueError("Cannot cancel a paid or reversed payment.")
            
        old_status = payment.status
        payment.status = 'cancelled'
        payment.save()
        
        PaymentService._log_audit(
            payment=payment, action='cancelled', changed_by=user, 
            changes={'status': {'old': old_status, 'new': 'cancelled'}},
            reason=reason
        )
        return payment
