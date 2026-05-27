"""
NLP Entity Extraction Engine
Handles extraction of structured ERP fields from voice transcriptions.
"""

import re
from typing import Dict, List, Tuple
from decimal import Decimal
from fuzzywuzzy import fuzz
from voice.models import FishNameAlias


class EntityExtractor:
    """
    Extract structured entities from voice transcription.
    Supports Tamil, English, Tanglish, and mixed input.
    """
    
    def __init__(self, company_id):
        self.company_id = company_id
        self.confidence_threshold = 0.7
    
    def extract_entities(self, text: str, language: str = 'tamil') -> Dict:
        """
        Main extraction method.
        Returns structured entities with confidence scores.
        """
        entities = {
            'fish_name': None,
            'quantity': None,
            'unit': None,
            'quantity_boxes': None,
            'weight_kg': None,
            'price_per_kg': None,
            'total_price': None,
            'ice_cost': None,
            'transport_cost': None,
            'labour_cost': None,
            'commission_cost': None,
            'supplier_name': None,
            'buyer_name': None,
            'payment_mode': None,
            'amount_paid': None,
            'pending_amount': None,
            'location': None,
            'date': None,
            'action': None,  # purchase, sale, payment, etc.
        }
        
        confidence_scores = {key: 0.0 for key in entities.keys()}
        
        # Preprocess text
        text = self._preprocess_text(text)
        
        # Extract each entity
        entities['fish_name'], confidence_scores['fish_name'] = self._extract_fish_name(text)
        entities['quantity_boxes'], confidence_scores['quantity_boxes'] = self._extract_boxes(text)
        entities['weight_kg'], confidence_scores['weight_kg'] = self._extract_weight(text)
        entities['price_per_kg'], confidence_scores['price_per_kg'] = self._extract_price_per_kg(text)
        entities['ice_cost'], confidence_scores['ice_cost'] = self._extract_ice_cost(text)
        entities['transport_cost'], confidence_scores['transport_cost'] = self._extract_transport_cost(text)
        entities['labour_cost'], confidence_scores['labour_cost'] = self._extract_labour_cost(text)
        entities['commission_cost'], confidence_scores['commission_cost'] = self._extract_commission(text)
        entities['supplier_name'], confidence_scores['supplier_name'] = self._extract_supplier(text)
        entities['buyer_name'], confidence_scores['buyer_name'] = self._extract_buyer(text)
        entities['payment_mode'], confidence_scores['payment_mode'] = self._extract_payment_mode(text)
        entities['amount_paid'], confidence_scores['amount_paid'] = self._extract_amount_paid(text)
        entities['action'], confidence_scores['action'] = self._detect_action(text)
        
        # Calculate overall confidence
        non_none_scores = [v for k, v in confidence_scores.items() if entities[k] is not None]
        overall_confidence = sum(non_none_scores) / len(non_none_scores) if non_none_scores else 0.0
        
        return {
            'entities': {k: v for k, v in entities.items() if v is not None},
            'confidence_scores': confidence_scores,
            'overall_confidence': overall_confidence
        }
    
    def _preprocess_text(self, text: str) -> str:
        """Normalize and clean text"""
        # Convert to lowercase for matching
        text = text.lower()
        
        # Handle common Tamil/Tanglish variations
        tamil_replacements = {
            'வாங்கினேன்': 'buy',
            'விற்றேன்': 'sell',
            'விக்கிறேன்': 'selling',
            'வாங்கிறேன்': 'buying',
            'குடுத்தேன்': 'paid',
            'குடுத்தார்': 'paid',
            'மீன்': 'fish',
            'பெட்டি': 'box',
            'பெட్టி': 'box',
            'கிலோ': 'kg',
            'கில்': 'kg',
            'ரூபாய்': 'rupees',
            'ரু': 'rs',
        }
        
        for tamil, english in tamil_replacements.items():
            text = text.replace(tamil, english)
        
        return text
    
    def _extract_fish_name(self, text: str) -> Tuple[str, float]:
        """Extract fish name from text"""
        # Try to find fish aliases in text
        aliases = FishNameAlias.objects.filter(company_id=self.company_id)
        
        best_match = None
        best_ratio = 0
        
        for alias_obj in aliases:
            # Check normalized name
            if alias_obj.normalized_name.lower() in text:
                return alias_obj.normalized_name, 0.95
            
            # Check all aliases with fuzzy matching
            for alias in alias_obj.aliases:
                ratio = fuzz.token_set_ratio(alias.lower(), text) / 100.0
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = alias_obj.normalized_name
        
        if best_match and best_ratio > 0.7:
            return best_match, best_ratio
        
        return None, 0.0
    
    def _extract_boxes(self, text: str) -> Tuple[int, float]:
        """
        Extract number of boxes.
        Pattern: "20 box", "20boxes", "20box", "பெட்டி 20"
        """
        patterns = [
            r'(\d+)\s*(?:box|boxes|பெட்டி|petti)',  # 20 box
            r'(?:box|boxes|பெட்டி|petti)\s*(\d+)',  # box 20
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                quantity = int(match.group(1))
                return quantity, 0.9
        
        return None, 0.0
    
    def _extract_weight(self, text: str) -> Tuple[float, float]:
        """
        Extract weight in kg.
        Pattern: "37 kg", "37kg", "37 kilo", "weight 37"
        """
        patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|கிலோ)',  # 37 kg
            r'(?:weight|wt|கடை)\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',  # weight 37
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                weight = float(match.group(1))
                return weight, 0.9
        
        return None, 0.0
    
    def _extract_price_per_kg(self, text: str) -> Tuple[Decimal, float]:
        """
        Extract price per kg.
        Pattern: "rate 420", "420 per kg", "price 420", "420 rupees"
        """
        patterns = [
            r'rate\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',  # rate 420
            r'(\d+(?:\.\d+)?)\s*(?:per kg|per kilo|rate)',  # 420 per kg
            r'price\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',  # price 420
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                price = Decimal(str(match.group(1)))
                return price, 0.9
        
        return None, 0.0
    
    def _extract_ice_cost(self, text: str) -> Tuple[Decimal, float]:
        """Extract ice cost"""
        patterns = [
            r'ice\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'ice[d]?\s*(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                cost = Decimal(str(match.group(1)))
                return cost, 0.85
        
        return None, 0.0
    
    def _extract_transport_cost(self, text: str) -> Tuple[Decimal, float]:
        """Extract transport cost"""
        patterns = [
            r'transport\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'conveyance\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'vehicle\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                cost = Decimal(str(match.group(1)))
                return cost, 0.85
        
        return None, 0.0
    
    def _extract_labour_cost(self, text: str) -> Tuple[Decimal, float]:
        """Extract labour/loading cost"""
        patterns = [
            r'labour\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'labor\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'loading\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                cost = Decimal(str(match.group(1)))
                return cost, 0.80
        
        return None, 0.0
    
    def _extract_commission(self, text: str) -> Tuple[Decimal, float]:
        """Extract commission cost"""
        patterns = [
            r'commission\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'comm\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'broker\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                cost = Decimal(str(match.group(1)))
                return cost, 0.80
        
        return None, 0.0
    
    def _extract_supplier(self, text: str) -> Tuple[str, float]:
        """Extract supplier name"""
        pattern = r'(?:from|supplier|வெண்டு|விற்பனையாளர்)\s+([a-zA-Z\s]+?)(?:\s+(?:rate|price|box|box|kg)|$)'
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            name = match.group(1).strip()
            return name, 0.7
        
        return None, 0.0
    
    def _extract_buyer(self, text: str) -> Tuple[str, float]:
        """Extract buyer name"""
        pattern = r'(?:to|buyer|buy|to|க\|:?\s+([a-zA-Z\s]+?)(?:\s+(?:boxes|kg|rate|price)|$)'
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            name = match.group(1).strip()
            return name, 0.7
        
        return None, 0.0
    
    def _extract_payment_mode(self, text: str) -> Tuple[str, float]:
        """Extract payment mode (cash, cheque, online, etc.)"""
        modes = {
            'cash': ['cash', 'notes', 'கேஷ்', 'नकद'],
            'cheque': ['cheque', 'check', 'چیک'],
            'online': ['online', 'transfer', 'net', 'bank', 'gpay', 'phonepe', 'paytm'],
            'credit': ['credit', 'credit', 'देय'],
            'upi': ['upi', 'gpay', 'phonepe', 'paytm'],
        }
        
        for mode, keywords in modes.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    return mode, 0.85
        
        return None, 0.0
    
    def _extract_amount_paid(self, text: str) -> Tuple[Decimal, float]:
        """Extract amount paid"""
        patterns = [
            r'paid\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'amount\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'given\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',
            r'kudutharu\s*(?:is|:)?\s*(\d+(?:\.\d+)?)',  # Tamil for "given"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = Decimal(str(match.group(1)))
                return amount, 0.85
        
        return None, 0.0
    
    def _detect_action(self, text: str) -> Tuple[str, float]:
        """Detect primary action (purchase, sale, payment, etc.)"""
        if any(word in text for word in ['buy', 'bought', 'வாங்கினேன்', 'வாங்கிறேன்']):
            return 'purchase', 0.9
        
        if any(word in text for word in ['sell', 'sold', 'விற்றேன்', 'விக்கிறேன்']):
            return 'sale', 0.9
        
        if any(word in text for word in ['paid', 'pay', 'payment', 'குடுத்தேன்']):
            return 'payment', 0.9
        
        if any(word in text for word in ['stock', 'inventory', 'update']):
            return 'inventory', 0.85
        
        return 'inquiry', 0.5


class ConfidenceScorer:
    """Calculate confidence scores for extracted entities"""
    
    @staticmethod
    def score_extraction(entities: Dict, confidence_scores: Dict) -> float:
        """
        Calculate overall extraction confidence.
        Weights critical fields higher.
        """
        critical_fields = ['fish_name', 'quantity_boxes', 'price_per_kg']
        important_fields = ['ice_cost', 'transport_cost', 'weight_kg']
        optional_fields = ['supplier_name', 'buyer_name']
        
        total_weight = 0
        weighted_score = 0
        
        # Weight critical fields
        for field in critical_fields:
            if entities.get(field) is not None:
                weight = 0.4
                total_weight += weight
                weighted_score += confidence_scores.get(field, 0) * weight
        
        # Weight important fields
        for field in important_fields:
            if entities.get(field) is not None:
                weight = 0.2
                total_weight += weight
                weighted_score += confidence_scores.get(field, 0) * weight
        
        # Weight optional fields
        for field in optional_fields:
            if entities.get(field) is not None:
                weight = 0.1
                total_weight += weight
                weighted_score += confidence_scores.get(field, 0) * weight
        
        if total_weight == 0:
            return 0.0
        
        return weighted_score / total_weight


class ClarificationEngine:
    """Determine what fields need clarification"""
    
    @staticmethod
    def get_missing_required_fields(entities: Dict, form_type: str) -> List[str]:
        """
        Based on form type, determine required fields.
        Return list of missing fields.
        """
        required_fields = {
            'purchase': ['fish_name', 'quantity_boxes', 'price_per_kg'],
            'sale': ['fish_name', 'quantity_boxes', 'price_per_kg', 'buyer_name'],
            'payment': ['buyer_name', 'amount_paid', 'payment_mode'],
            'inventory': ['fish_name', 'quantity_boxes'],
        }
        
        required = required_fields.get(form_type, ['fish_name', 'quantity_boxes'])
        missing = [field for field in required if entities.get(field) is None]
        
        return missing
    
    @staticmethod
    def get_low_confidence_fields(entities: Dict, confidence_scores: Dict, threshold: float = 0.7) -> List[str]:
        """Get fields that have low confidence scores"""
        return [
            field for field, conf in confidence_scores.items()
            if entities.get(field) is not None and conf < threshold
        ]
