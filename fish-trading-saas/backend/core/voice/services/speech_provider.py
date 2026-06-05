"""
Speech-to-Text Provider Service
Abstract interface for multiple speech recognition providers.
"""

import os
import io
from abc import ABC, abstractmethod
from typing import Dict, Optional, List
import requests
from django.conf import settings


class SpeechProvider(ABC):
    """Abstract base class for speech providers"""
    
    @abstractmethod
    def transcribe(self, audio_data: bytes, language: str = 'ta-IN') -> Dict:
        """
        Transcribe audio to text.
        
        Returns:
        {
            'transcript': 'transcribed text',
            'confidence': 0.95,  # 0-1.0
            'language': 'ta-IN',
            'alternatives': ['alt text 1', 'alt text 2'],
            'response_time_ms': 1234,
            'cost': 0.006,
        }
        """
        pass
    
    @abstractmethod
    def estimate_cost(self, duration_seconds: float) -> float:
        """Estimate cost in USD"""
        pass


class GoogleSpeechProvider(SpeechProvider):
    """Google Cloud Speech-to-Text provider"""
    
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_SPEECH_API_KEY')
        self.endpoint = 'https://speech.googleapis.com/v1/speech:recognize'
        self.language_codes = {
            'tamil': 'ta-IN',
            'english': 'en-IN',
            'english_us': 'en-US',
            'hindi': 'hi-IN',
            'tanglish': 'ta-IN',
            'mixed': 'ta-IN',  # Primary
        }
    
    def transcribe(self, audio_data: bytes, language: str = 'tamil') -> Dict:
        """Transcribe using Google Cloud Speech-to-Text"""
        import base64
        import time
        
        start_time = time.time()
        
        language_code = self.language_codes.get(language.lower(), 'ta-IN')
        
        # Prepare request
        audio_content = base64.b64encode(audio_data).decode()
        
        config = {
            'encoding': 'LINEAR16',
            'languageCode': language_code,
            'alternativeLanguageCodes': ['ta-IN', 'en-IN'],  # Fallbacks
            'enableAutomaticPunctuation': True,
            'model': 'latest_long',  # Best for longer recordings
            'useEnhanced': True,
        }
        
        request_body = {
            'config': config,
            'audio': {'content': audio_content}
        }
        
        try:
            response = requests.post(
                f'{self.endpoint}?key={self.api_key}',
                json=request_body,
                timeout=30
            )
            response.raise_for_status()
        except Exception as e:
            raise Exception(f"Google Speech API error: {str(e)}")
        
        result = response.json()
        
        if 'results' not in result or not result['results']:
            return {
                'transcript': '',
                'confidence': 0.0,
                'language': language_code,
                'alternatives': [],
                'response_time_ms': int((time.time() - start_time) * 1000),
                'cost': self._calculate_cost(len(audio_data)),
                'error': 'No speech detected'
            }
        
        # Extract best result
        best_result = result['results'][-1]['alternatives'][0]
        transcript = best_result.get('transcript', '')
        confidence = best_result.get('confidence', 0.0)
        
        # Extract alternatives
        alternatives = [alt.get('transcript', '') for alt in result['results'][-1]['alternatives'][1:3]]
        
        return {
            'transcript': transcript,
            'confidence': confidence,
            'language': language_code,
            'alternatives': alternatives,
            'response_time_ms': int((time.time() - start_time) * 1000),
            'cost': self._calculate_cost(len(audio_data)),
            'provider': 'google'
        }
    
    def estimate_cost(self, duration_seconds: float) -> float:
        """Google: $0.006 per 15 seconds"""
        # Convert to 15-second blocks
        blocks = max(1, int((duration_seconds + 14) / 15))
        return blocks * 0.006
    
    def _calculate_cost(self, audio_bytes: int) -> float:
        """Rough estimate from audio size"""
        # Assuming ~16kHz, 16-bit mono: ~32KB per second
        estimated_duration = audio_bytes / 32000
        return self.estimate_cost(estimated_duration)


class DeepgramProvider(SpeechProvider):
    """Deepgram speech-to-text provider"""
    
    def __init__(self):
        self.api_key = os.getenv('DEEPGRAM_API_KEY')
        self.endpoint = 'https://api.deepgram.com/v1/listen'
        self.language_codes = {
            'tamil': 'ta',
            'english': 'en',
            'hindi': 'hi',
            'tanglish': 'ta',
            'mixed': 'ta',
        }
    
    def transcribe(self, audio_data: bytes, language: str = 'tamil') -> Dict:
        """Transcribe using Deepgram"""
        import time
        
        start_time = time.time()
        
        language_code = self.language_codes.get(language.lower(), 'ta')
        
        headers = {
            'Authorization': f'Token {self.api_key}',
            'Content-Type': 'application/octet-stream'
        }
        
        params = {
            'language': language_code,
            'model': 'nova-2',
            'punctuate': True,
            'tier': 'nova',
        }
        
        try:
            response = requests.post(
                self.endpoint,
                headers=headers,
                params=params,
                data=audio_data,
                timeout=30
            )
            response.raise_for_status()
        except Exception as e:
            raise Exception(f"Deepgram API error: {str(e)}")
        
        result = response.json()
        
        if 'results' not in result:
            return {
                'transcript': '',
                'confidence': 0.0,
                'language': language_code,
                'alternatives': [],
                'response_time_ms': int((time.time() - start_time) * 1000),
                'cost': self._calculate_cost(len(audio_data)),
                'error': 'No speech detected'
            }
        
        # Extract transcript
        alternatives = result['results']['alternatives']
        best = alternatives[0]
        
        transcript = best.get('transcript', '')
        confidence = best.get('confidence', 0.0)
        
        other_alternatives = [alt.get('transcript', '') for alt in alternatives[1:3]]
        
        return {
            'transcript': transcript,
            'confidence': confidence,
            'language': language_code,
            'alternatives': other_alternatives,
            'response_time_ms': int((time.time() - start_time) * 1000),
            'cost': self._calculate_cost(len(audio_data)),
            'provider': 'deepgram'
        }
    
    def estimate_cost(self, duration_seconds: float) -> float:
        """Deepgram: $0.0043 per minute"""
        return (duration_seconds / 60) * 0.0043
    
    def _calculate_cost(self, audio_bytes: int) -> float:
        """Rough estimate from audio size"""
        estimated_duration = audio_bytes / 32000
        return self.estimate_cost(estimated_duration)


class OpenAIRealtimeProvider(SpeechProvider):
    """OpenAI Realtime API provider"""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.endpoint = 'https://api.openai.com/v1/audio/transcriptions'
    
    def transcribe(self, audio_data: bytes, language: str = 'tamil') -> Dict:
        """Transcribe using OpenAI Whisper"""
        import time
        
        start_time = time.time()
        
        # Map language to OpenAI supported codes
        language_map = {
            'tamil': 'ta',
            'english': 'en',
            'hindi': 'hi',
            'tanglish': 'ta',
            'mixed': 'ta',
        }
        
        language_code = language_map.get(language.lower(), 'ta')
        
        headers = {
            'Authorization': f'Bearer {self.api_key}'
        }
        
        files = {
            'file': ('audio.wav', io.BytesIO(audio_data), 'audio/wav')
        }
        
        data = {
            'model': 'whisper-1',
            'language': language_code,
            'temperature': 0.2,
        }
        
        try:
            response = requests.post(
                self.endpoint,
                headers=headers,
                files=files,
                data=data,
                timeout=60
            )
            response.raise_for_status()
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
        
        result = response.json()
        
        transcript = result.get('text', '')
        
        return {
            'transcript': transcript,
            'confidence': 0.85,  # Whisper doesn't return confidence
            'language': language_code,
            'alternatives': [],
            'response_time_ms': int((time.time() - start_time) * 1000),
            'cost': self._calculate_cost(len(audio_data)),
            'provider': 'openai'
        }
    
    def estimate_cost(self, duration_seconds: float) -> float:
        """OpenAI: $0.02 per minute"""
        return (duration_seconds / 60) * 0.02
    
    def _calculate_cost(self, audio_bytes: int) -> float:
        """Rough estimate"""
        estimated_duration = audio_bytes / 32000
        return self.estimate_cost(estimated_duration)


class WhisperOfflineProvider(SpeechProvider):
    """Local Whisper (offline) provider"""
    
    def __init__(self):
        self.model = None
        self._init_model()
    
    def _init_model(self):
        """Initialize Whisper model"""
        try:
            import whisper
            # Use tiny model for fast local inference
            self.model = whisper.load_model("tiny", device="cpu")
        except ImportError:
            raise Exception("Whisper not installed. Install with: pip install openai-whisper")
    
    def transcribe(self, audio_data: bytes, language: str = 'tamil') -> Dict:
        """Transcribe using local Whisper"""
        import time
        import tempfile
        import numpy as np
        
        start_time = time.time()
        
        # Language code mapping
        language_map = {
            'tamil': 'ta',
            'english': 'en',
            'hindi': 'hi',
            'tanglish': 'ta',
            'mixed': 'ta',
        }
        
        language_code = language_map.get(language.lower(), 'ta')
        
        try:
            # Save audio to temp file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_file.write(audio_data)
                tmp_path = tmp_file.name
            
            # Transcribe
            result = self.model.transcribe(tmp_path, language=language_code)
            
            # Clean up
            import os
            os.unlink(tmp_path)
            
            return {
                'transcript': result.get('text', ''),
                'confidence': 0.80,  # Whisper doesn't return confidence
                'language': language_code,
                'alternatives': [],
                'response_time_ms': int((time.time() - start_time) * 1000),
                'cost': 0.0,  # Offline = no cost
                'provider': 'whisper_offline'
            }
        
        except Exception as e:
            raise Exception(f"Whisper offline error: {str(e)}")
    
    def estimate_cost(self, duration_seconds: float) -> float:
        """Local inference: no cost"""
        return 0.0


class SpeechProviderFactory:
    """Factory to get appropriate speech provider"""
    
    _providers = {
        'google': GoogleSpeechProvider,
        'deepgram': DeepgramProvider,
        'openai': OpenAIRealtimeProvider,
        'whisper_offline': WhisperOfflineProvider,
    }
    
    @classmethod
    def get_provider(cls, provider_name: str = None) -> SpeechProvider:
        """
        Get speech provider.
        
        Defaults to Google (best for Tamil).
        Falls back to others if primary fails.
        """
        if provider_name is None:
            provider_name = getattr(settings, 'VOICE_PRIMARY_PROVIDER', 'google')
        
        provider_class = cls._providers.get(provider_name)
        
        if not provider_class:
            raise ValueError(f"Unknown speech provider: {provider_name}")
        
        return provider_class()
    
    @classmethod
    def get_fallback_providers(cls) -> List[SpeechProvider]:
        """Get fallback providers in order"""
        # Google -> Deepgram -> OpenAI -> Whisper
        providers = []
        
        for name in ['google', 'deepgram', 'openai', 'whisper_offline']:
            try:
                providers.append(cls.get_provider(name))
            except:
                pass
        
        return providers
    
    @classmethod
    def transcribe_with_fallback(cls, audio_data: bytes, language: str = 'tamil') -> Dict:
        """Try primary provider, fall back to others on failure"""
        providers = cls.get_fallback_providers()
        
        last_error = None
        
        for provider in providers:
            try:
                result = provider.transcribe(audio_data, language)
                if result.get('transcript'):
                    return result
            except Exception as e:
                last_error = e
                continue
        
        raise Exception(f"All speech providers failed. Last error: {last_error}")
