# Voice Assistant System - Architecture

## 1. VOICE PROVIDER RECOMMENDATION

### Provider Comparison

| Provider | Tamil | Tanglish | Cost | Latency | Offline | Recommendation |
|----------|-------|----------|------|---------|---------|-----------------|
| OpenAI Realtime API | ✅ (Good) | ✅ | $0.01/min | 100-200ms | ❌ | Great for quality |
| Google Speech-to-Text | ✅ (Excellent) | ✅ | $0.006/15sec | 200-500ms | ✅ | **BEST FOR TAMIL** |
| Deepgram | ✅ (Good) | ✅ | $0.0043/min | 50-100ms | ❌ | Fast, affordable |
| Whisper (OpenAI) | ✅ (Good) | ✅ | $0.02/min | 1-5s | ✅ | Offline capable |
| Azure Speech | ✅ (Good) | ⚠️ | $1/month+ 0.006/audio/min | 300-600ms | ⚠️ | Enterprise |

### **FINAL RECOMMENDATION: Hybrid Strategy**

**PRIMARY (Online):** Google Cloud Speech-to-Text
- Best Tamil recognition accuracy
- Cost effective at scale
- Supports real-time streaming
- Great Tanglish handling

**SECONDARY (Fallback):** Deepgram
- Faster latency (backup if Google fails)
- Affordable
- Good for noisy environments

**OFFLINE:** Whisper (openai/stable-ts or local model)
- Works completely offline
- Good accuracy
- Can be self-hosted
- Process on-device for privacy

---

## 2. NLP STRATEGY

### Hybrid Approach: LLM + Rule-Based

**Primary NLP:** Use Claude 3.5 Sonnet (via API)
- Context-aware extraction
- Handles complex Tamil/Tanglish
- State-aware (remembers conversation)
- Cost: ~$0.003 per extraction

**Rule-Based Fallback:**
- Fish name regex patterns
- Numeric extraction
- Known keywords
- Fallback when LLM unavailable

**Entity Extraction Pipeline:**
1. Transcribed text → Preprocess (normalize, correct spelling)
2. Extract entities (fish, quantity, rate, etc.)
3. Confidence scoring (LLM confidence + fuzzy matching)
4. Fill form fields
5. Request clarification if confidence < 70%

---

## 3. DATABASE SCHEMA

```
VoiceSession
  id (UUID)
  user (FK: User)
  company (FK: Company)
  language (tamil, english, hindi, tanglish)
  start_time
  end_time
  status (active, completed, failed)
  
VoiceCommand
  id (UUID)
  session (FK: VoiceSession)
  audio_file (encrypted storage path)
  transcript_raw (from speech provider)
  transcript_cleaned (after preprocessing)
  duration_seconds
  confidence_score (0-100)
  extracted_entities (JSON)
  related_form (purchase, sale, payment)
  status (transcribed, extracted, confirmed, error)
  
VoiceTranscript
  id (UUID)
  command (FK: VoiceCommand)
  provider (google, deepgram, whisper, openai)
  response_time_ms
  cost (for tracking)
  
FishNameAlias
  id (UUID)
  company (FK: Company)
  normalized_name (Vanjaram, Mathi, etc.)
  aliases (JSON array: ["வஞ்சரம்", "vanjaram", "seer fish"])
  fish (FK: Fish, optional for linking)
```

---

## 4. API DESIGN

### REST Endpoints

```
POST   /voice/start/              - Start recording session
GET    /voice/session/{id}/       - Get session details
POST   /voice/process/            - Process audio + extract entities
PUT    /voice/confirm/            - Confirm extraction + save form
POST   /voice/settings/           - Update voice settings
GET    /voice/history/            - Get command history
POST   /voice/clarify/            - Request clarification
GET    /voice/statistics/         - Voice analytics
```

### WebSocket for Real-time

```
ws://api/voice/stream/
  - Real-time waveform data
  - Live transcription preview
  - Processing status updates
```

---

## 5. SECURITY MODEL

```
Authentication:
  - JWT token validation (existing system)
  - Voice commands tied to user session
  - Tenant isolation (multi-tenant safe)

Audio Storage:
  - Encrypted at rest (AES-256)
  - Stored in secure bucket (S3/MinIO)
  - Auto-delete after 30 days (configurable)
  - Access logs for compliance

Permission Rules:
  - User can only access own voice records
  - Tenant admin can view tenant stats
  - Platform admin: full access with audit trail
```

---

## 6. OFFLINE STRATEGY

```
Frontend:
  - Record audio locally (IndexedDB)
  - Queue commands in LocalStorage
  - Show "Syncing..." status

Backend:
  - Queue table: VoiceCommandQueue
  - Celery task: sync_queued_commands
  - Exponential backoff (3, 5, 10, 30 min)
  - Deduplication by audio hash

Sync Logic:
  1. Check internet connectivity
  2. Upload queued audio files
  3. Process through NLP pipeline
  4. Auto-save if confidence > 80%
  5. Request confirmation if confidence 50-80%
  6. Discard if confidence < 50%
```

---

## 7. CONFIDENCE SCORING

```
Confidence Calculation:
  - Speech provider confidence (0-1.0)
  - Entity extraction confidence per field (0-1.0)
  - Fuzzy matching with known values
  - Combined weighted score (0-100)

Thresholds:
  > 90%:  Auto-save, no confirmation
  70-90%: Show confirmation, highlight potentially incorrect fields
  50-70%: Request clarification on fields
  < 50%:  Reject extraction, ask user to repeat
```

---

## 8. ERROR RECOVERY

```
User Corrections:
  "Vanjaram not nethili" 
    → System: "OK, Vanjaram noted"
    
Background Noise:
  - Auto-retry with noise filter
  - Request user to repeat if unclear
  
Network Failure:
  - Queue locally
  - Sync when online
  - Show offline indicator
  
Timeout:
  - 30 second max recording
  - Auto-stop if 3 seconds silence
  - Allow user override
```

---

## 9. MULTI-LANGUAGE SUPPORT

```
Tamil:
  "20 box வஞ்சரம் வாங்கினேன் rate 420"
  
Tanglish:
  "20 box vanjaram vanginen rate 420"
  
Mixed:
  "20 box vanjaram வாங்கினேன் rate 420"
  
English:
  "20 boxes of vanjaram at rate 420"

Language Detection:
  - Automatic from voice
  - User can set preference
  - Fallback to company default
```

---

## 10. CONVERSATION STATE MACHINE

```
States:
  IDLE
    ↓ (user speaks)
  RECORDING
    ↓ (user stops)
  TRANSCRIBING
    ↓ (speech provider processes)
  EXTRACTING
    ↓ (NLP extracts entities)
  VALIDATING
    ↓ (check required fields)
  CLARIFYING (if missing required fields)
    ↓ (ask user for missing info)
  CONFIRMING
    ↓ (show user what we extracted)
  SAVING
    ↓ (save to DB)
  COMPLETED

Error states:
  - NETWORK_ERROR → Queue + retry
  - CONFIDENCE_LOW → Request clarification
  - TIMEOUT → Ask to repeat
```

---

## 11. COST OPTIMIZATION

### Per-Command Costs (Estimate)

```
Google Speech-to-Text:
  - 15 seconds = $0.006
  - Average fish trade command: 10-15 seconds
  - Cost: $0.004-0.006 per command

Entity Extraction (Claude):
  - Input: ~200 tokens
  - Output: ~50 tokens
  - Cost: ~$0.0003 per extraction

Offline Whisper (batch):
  - No API cost
  - Computation cost: minimal (on-device)
  
Total per command: $0.004-0.009

Cost Optimization:
  1. Batch processing at night (offline)
  2. Cache common fish names/suppliers
  3. Reuse similar extractions
  4. Use cheaper provider for batch
  5. Estimate: ~$0.10-0.15 per trading session (8-10 commands)
```

---

## 12. IMPLEMENTATION TIMELINE

**Week 1:**
- Database models
- API endpoints
- Google Speech-to-Text integration
- Basic NLP engine

**Week 2:**
- Frontend recorder component
- Real-time waveform display
- Form auto-fill logic
- Settings page

**Week 3:**
- Offline support
- Error recovery
- Multi-language support
- Analytics dashboard

**Week 4:**
- Testing
- Optimization
- Documentation
- Deployment

---

## 13. FILES TO CREATE

### Backend
```
voice/
  models/
    __init__.py
    session.py (VoiceSession, VoiceCommand, VoiceTranscript)
    alias.py (FishNameAlias)
    queue.py (VoiceCommandQueue for offline)
  
  serializers/
    __init__.py
    voice.py (All serializers)
  
  views/
    __init__.py
    session.py (VoiceSessionViewSet)
    command.py (VoiceCommandViewSet)
    settings.py (VoiceSettingsView)
  
  services/
    __init__.py
    speech.py (Speech provider abstraction)
    nlp.py (NLP extraction)
    fish_normalizer.py (Fish name normalization)
    confidence.py (Scoring)
  
  tasks.py (Celery tasks)
  urls.py
  apps.py
  admin.py
```

### Frontend
```
src/components/voice/
  VoiceRecorder.jsx
  WaveformDisplay.jsx
  VoiceAssistant.jsx
  VoiceSettings.jsx
  ConfirmationModal.jsx

src/services/
  voiceService.js
  audioRecorder.js

src/hooks/
  useVoiceRecorder.js

src/contexts/
  VoiceContext.jsx

src/styles/
  voice.css
```
