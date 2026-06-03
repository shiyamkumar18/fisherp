import os
try:
    import stripe
except ImportError:
    stripe = None

from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging
from subscriptions.models import Subscription

logger = logging.getLogger(__name__)

# Initialize Stripe with the API key from settings or environment
if stripe:
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY', 'sk_test_placeholder')


def create_checkout_session(company, tier):
    """
    Generate a Stripe Checkout Session for a specific subscription tier.
    """
    if not stripe:
        raise Exception("Stripe package is not installed.")
        
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            customer_email=company.email,
            client_reference_id=str(company.id),
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"FisherP {tier.name} Plan",
                    },
                    'unit_amount': int(tier.price_monthly * 100),  # Stripe uses cents
                    'recurring': {
                        'interval': 'month'
                    }
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/billing/cancel",
        )
        return session.url
    except Exception as e:
        logger.error(f"Error creating Stripe checkout session: {str(e)}")
        raise e


def handle_stripe_webhook(payload, sig_header):
    """
    Process incoming Stripe webhooks for subscription lifecycles.
    """
    endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        # Invalid payload
        return False
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return False

    if event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        _handle_payment_succeeded(invoice)
    elif event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        _handle_payment_failed(invoice)
    elif event['type'] == 'customer.subscription.deleted':
        subscription_obj = event['data']['object']
        _handle_subscription_deleted(subscription_obj)

    return True


def _handle_payment_succeeded(invoice):
    # E.g., extend subscription expiry
    pass


def _handle_payment_failed(invoice):
    # E.g., mark subscription as past_due or suspended
    pass


def _handle_subscription_deleted(subscription_obj):
    # E.g., cancel the subscription in our DB
    pass
