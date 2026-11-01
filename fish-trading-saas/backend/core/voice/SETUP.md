# Voice Assistant System - Implementation Guide

## Overview

This document provides setup and implementation instructions for the Voice Assistant System for the Fish ERP SaaS application.

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Database Setup](#database-setup)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Installation

### Backend Dependencies

Add the following to `requirements.txt`:

```
# Audio & Speech Recognition
openai-whisper>=20240101  # For offline speech recognition
google-cloud-speech>=2.21.0  # Google Speech-to-Text
deepgram-sdk>=3.0.0  # Deepgram (fallback)

# NLP & Text Processing
fuzzywuzzy>=0.18.0  # Fuzzy string matching for fish names
python-Levenshtein>=0.21.1  # Fast string matching

# Celery (for async processing)
celery>=5.3.0
redis>=5.0.0

# Existing dependencies (already in project)
# - Django
# - DRF
# - PostgreSQL
# - JWT auth
```

### Frontend Dependencies

The frontend uses only native Web APIs (no additional packages needed):
- Web Audio API (for recording)
- Canvas API (for waveform display)
- Fetch API (for communication)

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Voice Provider Configuration
VOICE_PRIMARY_PROVIDER=google  # Options: google, deepgram, openai, whisper_offline

# Google Cloud Speech-to-Text
GOOGLE_SPEECH_API_KEY=your_google_api_key

# Deepgram (fallback)
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenAI (fallback)
OPENAI_API_KEY=your_openai_api_key

# Audio Storage
AUDIO_STORAGE_PATH=/path/to/audio/storage  # Local or S3
AUDIO_ENCRYPTION_KEY=your_encryption_key

# Offline Mode
OFFLINE_QUEUE_ENABLED=true
OFFLINE_SYNC_INTERVAL=300  # Sync every 5 minutes
OFFLINE_BATCH_SIZE=10  # Process 10 queued commands at once

# Analytics
VOICE_ANALYTICS_ENABLED=true
VOICE_ANALYTICS_RETENTION_DAYS=90  # Keep analytics for 90 days

# Audio Privacy
AUDIO_AUTO_DELETE_DAYS=30  # Auto-delete audio after 30 days
STORE_AUDIO=true  # Store audio for improvement (set to false for privacy)
```

### Django Settings

The voice app is already added to `INSTALLED_APPS` in `config/settings.py`:

```python
TENANT_APPS = [
    # ...
    "voice",  # Voice Assistant
    # ...
]
```

### URL Configuration

Voice URLs are already configured in `config/urls.py`:

```python
# Voice Assistant API
path("api/voice/", include("voice.urls")),
```

---

## Database Setup

### Create Migrations

```bash
# Create migrations for the voice app
python manage.py makemigrations voice

# Apply migrations
python manage.py migrate voice
```

### Initialize Fish Aliases

The fish name aliases are auto-loaded from the `DEFAULT_FISH_ALIASES` in the `FishNormalizer` class. To add custom aliases for your company:

```python
from voice.services.fish_normalizer import FishNormalizer

normalizer = FishNormalizer(company_id=1)
normalizer.add_alias(
    normalized_name='Vanjaram',
    aliases=['வஞ்சரம்', 'vanjaram', 'seer fish', 'vanjiram'],
    english_name='Seer Fish',
    tamil_name='வஞ்சரம்'
)
```

Or via the Django admin interface:
1. Go to `/admin/voice/fishnametasmatch/`
2. Click "Add Fish Name Alias"
3. Fill in the details

---

## API Endpoints

### Base URL

All endpoints are prefixed with `/api/voice/`

### Session Management

#### Start a Voice Session
```
POST /api/voice/sessions/
Content-Type: application/json

{
  "language": "tamil"  # or "english", "hindi", "tanglish", "mixed"
}

Response:
{
  "id": "uuid",
  "user": 1,
  "company": 1,
  "language": "tamil",
  "status": "active",
  "start_time": "2024-05-26T10:00:00Z",
  "total_commands": 0,
  "created_at": "2024-05-26T10:00:00Z"
}
```

#### Get Active Session
```
GET /api/voice/sessions/active_session/

Response: Session object (same as above)
```

#### End Session
```
POST /api/voice/sessions/{id}/end_session/

Response: Session object with status="completed"
```

#### List Sessions
```
GET /api/voice/sessions/

Response: Array of Session objects
```

### Voice Command Processing

#### Process Audio
```
POST /api/voice/commands/process/
Content-Type: multipart/form-data

Form fields:
- audio_file: <file> (webm, wav, mp3)
- session_id: uuid
- language: "tamil" (optional, defaults to session language)
- form_type: "purchase" (optional: purchase, sale, payment, inventory)

Response:
{
  "command_id": "uuid",
  "transcript": "20 box vanjaram வாங்கினேன்",
  "transcript_cleaned": "20 box vanjaram bought",
  "extracted_entities": {
    "fish_name": "Vanjaram",
    "quantity_boxes": 20,
    "price_per_kg": 420,
    "ice_cost": 1000,
    "transport_cost": 500,
    "action": "purchase"
  },
  "confidence_scores": {
    "fish_name": 0.97,
    "quantity_boxes": 0.9,
    "price_per_kg": 0.9,
    ...
  },
  "overall_confidence": 0.92,
  "form_type": "purchase",
  "status": "confirming",
  "requires_confirmation": false,
  "missing_fields": [],
  "low_confidence_fields": []
}
```

#### Confirm Command
```
POST /api/voice/commands/confirm/
Content-Type: application/json

{
  "command_id": "uuid",
  "confirmed": true,
  "corrections": {
    "price_per_kg": 430,  # Corrected value
    "ice_cost": 1200
  }
}

Response:
{
  "command_id": "uuid",
  "status": "confirmed",
  "entities": {
    "fish_name": "Vanjaram",
    "quantity_boxes": 20,
    "price_per_kg": 430,
    "ice_cost": 1200,
    ...
  }
}
```

#### Clarify Command
```
POST /api/voice/commands/clarify/
Content-Type: application/json

{
  "command_id": "uuid",
  "clarification_text": "Rate is 430, not 420. Ice is 1200"
}

Response: Same as confirm
```

#### Get Command History
```
GET /api/voice/commands/history/?session_id=uuid

Response: Array of latest 50 VoiceCommand objects
```

### Settings Management

#### Get Voice Settings
```
GET /api/voice/settings/retrieve_settings/

Response:
{
  "primary_language": "tamil",
  "secondary_language": "english",
  "voice_gender": "female",
  "voice_speed": 1.0,
  "mic_sensitivity": 1.0,
  "noise_cancellation_enabled": true,
  "auto_save_enabled": false,
  "require_confirmation": true,
  "confidence_threshold": 70,
  "max_recording_duration": 120,
  "auto_stop_silence_duration": 3,
  ...
}
```

#### Update Voice Settings
```
POST /api/voice/settings/update_settings/
Content-Type: application/json

{
  "primary_language": "tamil",
  "voice_speed": 1.1,
  "auto_save_enabled": true,
  ...
}

Response: Updated settings object
```

### Analytics

#### Get Statistics
```
GET /api/voice/analytics/statistics/?date_from=2024-05-01&date_to=2024-05-26

Response: Array of VoiceAnalytics objects
{
  "date": "2024-05-26",
  "total_commands": 25,
  "successful_commands": 23,
  "failed_commands": 2,
  "average_confidence": 0.87,
  "average_response_time_ms": 1200,
  "total_audio_duration_seconds": 300,
  "total_cost": 0.15,
  ...
}
```

### Fish Name Aliases

#### List Aliases
```
GET /api/voice/aliases/list_aliases/

Response: Array of FishNameAlias objects
```

#### Add Alias
```
POST /api/voice/aliases/add_alias/
Content-Type: application/json

{
  "normalized_name": "Vanjaram",
  "aliases": ["வஞ்சரம்", "vanjaram", "seer fish"],
  "english_name": "Seer Fish",
  "tamil_name": "வஞ்சரம்"
}

Response: Created FishNameAlias object
```

---

## Frontend Integration

### Using VoiceAssistant Component

```jsx
import VoiceAssistant from '@/components/voice/VoiceAssistant';

function PurchaseForm() {
  const [showVoice, setShowVoice] = useState(false);

  const handleVoiceSave = (data) => {
    console.log('Voice data saved:', data);
    // Populate purchase form with voice data
    setPurchaseForm(data.entities);
  };

  return (
    <div>
      <button onClick={() => setShowVoice(true)}>
        🎤 Use Voice Entry
      </button>

      {showVoice && (
        <VoiceAssistant
          formType="purchase"
          onSave={handleVoiceSave}
          onCancel={() => setShowVoice(false)}
        />
      )}
    </div>
  );
}
```

### Using Individual Components

```jsx
import VoiceRecorder from '@/components/voice/VoiceRecorder';
import ConfirmationModal from '@/components/voice/ConfirmationModal';

function CustomVoiceFlow() {
  const [command, setCommand] = useState(null);

  return (
    <>
      <VoiceRecorder
        sessionId={sessionId}
        onProcess={setCommand}
      />
      
      {command && (
        <ConfirmationModal
          command={command}
          onConfirm={handleConfirm}
          onCancel={() => setCommand(null)}
        />
      )}
    </>
  );
}
```

### CSS Styling

The voice components use CSS variables for theming. Customize by setting these in your CSS:

```css
:root {
  --primary: #007bff;
  --success: #28a745;
  --danger: #dc3545;
  --warning: #ffc107;
  --dark: #343a40;
  --light: #f8f9fa;
  --border-radius: 8px;
}
```

---

## Testing

### Manual Testing

1. **Start a Session**
   ```bash
   curl -X POST http://localhost:8000/api/voice/sessions/ \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"language": "tamil"}'
   ```

2. **Record and Process Audio**
   - Open frontend
   - Click "Start Recording"
   - Say: "20 box vanjaram வாங்கினேன் 420 rate"
   - Click "Process"
   - Verify extraction

3. **Confirm and Save**
   - Review extracted data
   - Correct if needed
   - Click "Confirm & Save"

### Unit Tests

```bash
# Run voice tests
python manage.py test voice.tests

# Run with coverage
coverage run --source='voice' manage.py test voice
coverage report
```

### Load Testing

```bash
# Simulate concurrent voice sessions
locust -f voice/tests/load_tests.py --host=http://localhost:8000
```

---

## Troubleshooting

### Audio Not Recording

**Problem:** Microphone permission denied
**Solution:**
- Check browser permissions
- Ensure HTTPS in production
- Check browser console for errors

**Problem:** Empty audio file
**Solution:**
- Check microphone is working
- Increase recording duration in settings
- Check browser volume

### Poor Transcription Quality

**Problem:** "Tanglish not recognized"
**Solution:**
- Add custom aliases: Settings → Add Fish Alias
- Change language to "tanglish" or "mixed"
- Try English pronunciation slowly

**Problem:** Low confidence scores**
**Solution:**
- Check audio quality (reduce background noise)
- Enable noise cancellation in settings
- Reduce background noise
- Increase mic sensitivity

### API Errors

**Problem:** 401 Unauthorized
**Solution:**
- Check JWT token validity
- Refresh token if expired

**Problem:** 404 Not Found
**Solution:**
- Verify session_id is valid
- Check session belongs to current user

**Problem:** 400 Bad Request
**Solution:**
- Check request format (JSON/multipart)
- Verify all required fields are present

### Performance Issues

**Problem:** Slow response time
**Solution:**
- Check API provider status
- Switch to faster provider (Deepgram)
- Use offline mode for batch processing

**Problem:** High costs
**Solution:**
- Enable offline mode for batch
- Use Whisper offline for testing
- Reduce query frequency
- Batch commands at end of day

### Offline Sync Issues

**Problem:** Commands not syncing
**Solution:**
- Check internet connection
- Verify offline queue is enabled
- Check queue table: `VoiceCommandQueue`
- Manually trigger sync: Call `/api/voice/commands/sync-queue/`

---

## Performance Optimization

### Caching

Fish names are cached in memory after first lookup:

```python
from voice.services.fish_normalizer import FishNormalizer

normalizer = FishNormalizer(company_id=1)
# First call loads from DB
normalized = normalizer.normalize("vanjaram")
# Subsequent calls use cache
```

### Batch Processing

Process multiple commands at once during off-peak hours:

```bash
# Sync queued offline commands
python manage.py celery_beat  # Scheduled task
```

### Database Indexes

All frequently queried fields are indexed:
- user, company, session
- created_at (for time range queries)
- status (for filtering)

---

## Security

### Audio Storage

Audio is stored encrypted at rest:
```python
# Audio encryption happens automatically
# Uses AES-256 with per-command keys
```

### Tenant Isolation

All queries are automatically filtered by company:
```python
# Enforced in viewsets and serializers
queryset = VoiceCommand.objects.filter(
    session__company=request.user.company
)
```

### Rate Limiting

Configured in settings:
```python
VOICE_THROTTLE_RATE = "100/hour"  # Per user
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review API error messages
3. Check browser console for client-side errors
4. Check Django logs for server-side errors
5. Raise issue with detailed error message

---

## Roadmap

### Phase 2 Features (Coming Soon)
- [ ] Real-time streaming with WebSocket
- [ ] Voice-to-form auto-fill for all modules
- [ ] Multi-language context awareness
- [ ] Voice analytics dashboard
- [ ] Custom wake words
- [ ] Speaker identification

### Phase 3 Features
- [ ] Voice command shortcuts
- [ ] Predictive field filling
- [ ] Voice error recovery with ML
- [ ] Multi-user conversations
- [ ] Voice-to-SMS notifications

---

*Last Updated: May 26, 2024*
