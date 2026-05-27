"""
Fish Name Normalization Engine
Maps various spellings, languages, and slang to canonical fish names.
"""

from typing import Dict, List, Tuple
from fuzzywuzzy import fuzz
from decimal import Decimal
from voice.models import FishNameAlias
from trading.models import Fish


class FishNormalizer:
    """Normalize fish names from various languages and spellings"""
    
    # Built-in common fish aliases (Tamil, English, Tanglish)
    DEFAULT_FISH_ALIASES = {
        'Vanjaram': {
            'english': ['Seer Fish', 'King Fish', 'Kingfish'],
            'tamil': ['வஞ்சரம்', 'வாஞ்சிரம்'],
            'tanglish': ['vanjaram', 'vanjiram', 'vancharam'],
            'slang': ['ಸೀರ್', 'தேவலி'],
        },
        'Mathi': {
            'english': ['Sardine', 'Mackerel'],
            'tamil': ['மத்தி', 'மத்திமீன்'],
            'tanglish': ['mathi', 'matti'],
            'slang': ['pilchard'],
        },
        'Nethili': {
            'english': ['Anchovy', 'Indian Anchovy'],
            'tamil': ['நெத்திலி', 'நெத்திலிமீன்'],
            'tanglish': ['nethili', 'neathili'],
            'slang': ['ഞാണ്ട്'],
        },
        'Pomfret': {
            'english': ['Pomfret', 'White Pomfret', 'Black Pomfret'],
            'tamil': ['சிल்வர் பம்ப்ரட்', 'பம்ப்ரெட்'],
            'tanglish': ['pomfret', 'pomfrey'],
            'slang': ['வரை'],
        },
        'Prawn': {
            'english': ['Shrimp', 'Prawn', 'Tiger Prawn'],
            'tamil': ['இறால்', 'ரிம்ப்'],
            'tanglish': ['iraal', 'prawn'],
            'slang': ['झींगा', 'நண்டு'],
        },
        'Crab': {
            'english': ['Crab', 'Blue Crab'],
            'tamil': ['நண்டு', 'நட்டை'],
            'tanglish': ['nandu', 'crab'],
            'slang': ['കണ്ടത്'],
        },
        'Tilapia': {
            'english': ['Tilapia', 'Nile Tilapia'],
            'tamil': ['திலாபியா', 'பரவல'],
            'tanglish': ['tilapia', 'nile'],
        },
        'Catfish': {
            'english': ['Catfish', 'River Catfish'],
            'tamil': ['பൂണ്ട്', 'വിഷ്ണു'],
            'tanglish': ['catfish', 'magur'],
        },
        'Mackerel': {
            'english': ['Mackerel', 'Indian Mackerel'],
            'tamil': ['ಐರ', 'ஐരា'],
            'tanglish': ['mackerel', 'ayra'],
        },
        'Tuna': {
            'english': ['Tuna', 'Yellowfin Tuna'],
            'tamil': ['ट்यूना', 'ಕೋಳಿ'],
            'tanglish': ['tuna', 'kolli'],
        },
    }
    
    def __init__(self, company_id):
        self.company_id = company_id
        self._load_aliases()
    
    def _load_aliases(self):
        """Load aliases from database"""
        self.aliases = {}
        
        # Load from DB
        db_aliases = FishNameAlias.objects.filter(
            company_id=self.company_id,
            is_active=True
        )
        
        for alias_obj in db_aliases:
            self.aliases[alias_obj.normalized_name] = {
                'english': [alias_obj.english_name] if alias_obj.english_name else [],
                'tamil': [alias_obj.tamil_name] if alias_obj.tamil_name else [],
                'tanglish': alias_obj.aliases or [],
                'fish_id': alias_obj.fish_id,
            }
    
    def normalize(self, fish_name: str, threshold: float = 0.7) -> Tuple[str, float, int]:
        """
        Normalize fish name from any language/spelling.
        
        Returns:
            (normalized_name, confidence, fish_id)
        """
        if not fish_name:
            return None, 0.0, None
        
        fish_name = fish_name.strip().lower()
        
        # Exact match first
        for canonical, aliases in self.aliases.items():
            all_names = (
                [canonical.lower()] +
                [n.lower() for n in aliases.get('english', [])] +
                [n.lower() for n in aliases.get('tamil', [])] +
                [n.lower() for n in aliases.get('tanglish', [])]
            )
            
            if fish_name in all_names:
                fish_id = aliases.get('fish_id')
                return canonical, 1.0, fish_id
        
        # Fuzzy match
        best_match = None
        best_score = 0
        best_fish_id = None
        
        for canonical, aliases in self.aliases.items():
            all_names = (
                [canonical] +
                aliases.get('english', []) +
                aliases.get('tamil', []) +
                aliases.get('tanglish', [])
            )
            
            for name in all_names:
                score = fuzz.token_set_ratio(fish_name, name.lower()) / 100.0
                
                if score > best_score:
                    best_score = score
                    best_match = canonical
                    best_fish_id = aliases.get('fish_id')
        
        if best_score >= threshold:
            return best_match, best_score, best_fish_id
        
        return None, 0.0, None
    
    def add_alias(self, normalized_name: str, aliases: List[str], 
                  english_name: str = '', tamil_name: str = '') -> FishNameAlias:
        """Add new fish alias to database"""
        obj, created = FishNameAlias.objects.get_or_create(
            company_id=self.company_id,
            normalized_name=normalized_name,
            defaults={
                'english_name': english_name,
                'tamil_name': tamil_name,
                'aliases': aliases,
            }
        )
        
        if not created:
            obj.aliases = list(set(obj.aliases + aliases))
            obj.save()
        
        # Reload
        self._load_aliases()
        
        return obj
    
    def get_all_names_for_fish(self, fish_id: int) -> Dict[str, List[str]]:
        """Get all known names (Tamil, English, Tanglish) for a fish"""
        try:
            alias_obj = FishNameAlias.objects.get(
                company_id=self.company_id,
                fish_id=fish_id
            )
            
            return {
                'canonical': alias_obj.normalized_name,
                'english': [alias_obj.english_name] if alias_obj.english_name else [],
                'tamil': [alias_obj.tamil_name] if alias_obj.tamil_name else [],
                'tanglish': alias_obj.aliases,
            }
        except FishNameAlias.DoesNotExist:
            return {
                'canonical': None,
                'english': [],
                'tamil': [],
                'tanglish': [],
            }
    
    def track_usage(self, normalized_name: str):
        """Track fish name usage for learning"""
        try:
            alias_obj = FishNameAlias.objects.get(
                company_id=self.company_id,
                normalized_name=normalized_name
            )
            from django.utils import timezone
            alias_obj.usage_count += 1
            alias_obj.last_used = timezone.now()
            alias_obj.save()
        except FishNameAlias.DoesNotExist:
            pass
    
    @staticmethod
    def is_tanglish(text: str) -> bool:
        """Detect if text is Tanglish (Tamil in Latin script)"""
        # Common Tanglish patterns
        patterns = [
            'anga', 'ngana', 'vara', 'aiya', 'uku',
            'tt', 'rr', 'nn', 'mm',  # Double consonants
        ]
        
        tamil_chars = any(ord(c) >= 0x0B80 and ord(c) <= 0x0BFF for c in text)
        
        # If it has Tamil chars, it's not pure Tanglish
        if tamil_chars:
            return False
        
        # Check for Tanglish patterns
        for pattern in patterns:
            if pattern in text.lower():
                return True
        
        return False
    
    @staticmethod
    def transliterate_tanglish_to_tamil(text: str) -> str:
        """Simple Tanglish to Tamil transliteration"""
        # This is a simplified version - a full implementation would be more complex
        mapping = {
            'anga': 'அங்கா',
            'uu': 'ஊ',
            'aa': 'ஆ',
            'ii': 'ஈ',
            'ee': 'ஈ',
            'oo': 'ஊ',
        }
        
        result = text.lower()
        for tanglish, tamil in mapping.items():
            result = result.replace(tanglish, tamil)
        
        return result


class PriceNormalizer:
    """Normalize prices and costs"""
    
    @staticmethod
    def normalize_price(value, currency: str = 'INR') -> Decimal:
        """Normalize price value"""
        try:
            decimal_value = Decimal(str(value))
            if decimal_value < 0:
                raise ValueError("Price cannot be negative")
            return decimal_value
        except:
            return Decimal('0')
    
    @staticmethod
    def is_reasonable_price(price: Decimal, fish_type: str = '') -> bool:
        """
        Validate if price is reasonable for Indian fish market.
        Helps catch OCR/transcription errors.
        """
        # Typical ranges in INR per kg
        price_ranges = {
            'Vanjaram': (300, 800),
            'Mathi': (50, 150),
            'Nethili': (30, 100),
            'Pomfret': (200, 600),
            'Prawn': (400, 1200),
        }
        
        if fish_type in price_ranges:
            min_price, max_price = price_ranges[fish_type]
            return min_price <= price <= max_price
        
        # Generic: between 10 and 2000
        return 10 <= price <= 2000
    
    @staticmethod
    def is_reasonable_quantity(quantity: int, unit: str = 'box') -> bool:
        """Validate if quantity is reasonable"""
        if unit == 'box':
            return 1 <= quantity <= 1000
        elif unit == 'kg':
            return 1 <= quantity <= 5000
        else:
            return 1 <= quantity <= 10000
