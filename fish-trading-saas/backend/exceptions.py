from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

class APIError(Exception):
    \"\"\"Base API error with code.\"\"\"
    def __init__(self, message, code='API_ERROR', status_code=status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)

class SaleError(APIError):
    code = 'SALE_ERROR'

class InventoryError(APIError):
    code = 'INVENTORY_ERROR'

class SubscriptionLimitError(APIError):
    code = 'SUBSCRIPTION_LIMIT_EXCEEDED'
    status_code = status.HTTP_403_FORBIDDEN

# Services will raise these
