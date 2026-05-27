# Voice Assistant System - Dependencies

## Backend Dependencies to Add to requirements.txt

```
# Audio & Speech Recognition
# Google Cloud Speech-to-Text for primary speech recognition
google-cloud-speech==2.21.0

# Deepgram API for fallback/fast processing
deepgram-sdk==3.0.0

# OpenAI Whisper for offline speech recognition
openai-whisper==20240101

# NLP & Text Processing
# Fuzzy string matching for fish name variations
fuzzywuzzy==0.18.0
# Required for fast fuzzy matching
python-Levenshtein==0.21.1

# Existing dependencies (already in your requirements.txt)
# Django >= 4.2
# djangorestframework >= 3.14
# djangorestframework-simplejwt >= 5.0
# psycopg2-binary (PostgreSQL)
# celery >= 5.3.0 (already have this for background tasks)
# redis >= 5.0.0 (already have this for celery)
```

## Frontend Dependencies

The frontend uses only **native Web APIs** - NO additional npm packages needed:
- ✅ Web Audio API (recording)
- ✅ Canvas API (visualization)  
- ✅ Fetch API (communication)
- ✅ IndexedDB API (offline storage)

No new npm packages to install for the voice system!

## Installation Steps

### Step 1: Add Dependencies to requirements.txt

```bash
# Edit backend/requirements.txt and add these lines:

# Add these to the [audio-speech] section:
google-cloud-speech==2.21.0
deepgram-sdk==3.0.0
openai-whisper==20240101

# Add these to the [nlp] section:
fuzzywuzzy==0.18.0
python-Levenshtein==0.21.1

# If not already there, add celery and redis:
celery>=5.3.0
redis>=5.0.0
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
pip install -r backend/requirements.txt

# Or install just voice dependencies
pip install \
  google-cloud-speech==2.21.0 \
  deepgram-sdk==3.0.0 \
  openai-whisper==20240101 \
  fuzzywuzzy==0.18.0 \
  python-Levenshtein==0.21.1
```

### Step 3: Create Migrations

```bash
cd backend
python manage.py makemigrations voice
python manage.py migrate voice
```

## Optional Dependencies

### For Development/Testing

```bash
# For running tests with coverage
pip install coverage==7.2.0
pytest==7.4.0
pytest-django==4.5.0

# For API documentation
drf-spectacular==0.26.0
```

### For Performance

```bash
# Caching layer (optional, improves performance)
django-redis==5.3.0

# Async tasks (already have celery, but these are optional)
flower==2.0.0  # Celery monitoring
```

### For Deployment

```bash
# WSGI server
gunicorn==21.0.0

# Load balancer / reverse proxy config (nginx.conf already provided)
```

## Checking Installed Versions

```bash
# After installation, verify versions
pip list | grep -E "google-cloud|deepgram|whisper|fuzzywuzzy"

# Should show:
# deepgram-sdk              3.0.0
# google-cloud-speech       2.21.0
# openai-whisper            20240101
# fuzzywuzzy                0.18.0
# python-Levenshtein        0.21.1
```

## Troubleshooting Installation

### Issue: google-cloud-speech installation fails
```bash
# Fix: Install with specific version
pip install google-cloud-speech==2.21.0

# If still fails, try:
pip install --upgrade pip
pip install google-cloud-speech
```

### Issue: openai-whisper is very large (1GB+)
```bash
# This is normal - it includes ML models
# Installation takes 5-10 minutes
# Use --no-cache-dir to save space:
pip install --no-cache-dir openai-whisper
```

### Issue: python-Levenshtein compilation fails
```bash
# On Linux, ensure build tools are installed:
sudo apt-get install build-essential python3-dev

# Then try installation again:
pip install python-Levenshtein
```

### Issue: deepgram-sdk or google-cloud-speech give auth errors
```bash
# These require API keys at runtime, not installation
# Set environment variables:
export DEEPGRAM_API_KEY=your_key
export GOOGLE_SPEECH_API_KEY=your_key
```

## Production Deployment

### Using Docker

```dockerfile
# In backend/Dockerfile, add to RUN section:
RUN pip install \
  google-cloud-speech==2.21.0 \
  deepgram-sdk==3.0.0 \
  openai-whisper==20240101 \
  fuzzywuzzy==0.18.0 \
  python-Levenshtein==0.21.1
```

### Using Docker Compose

The `docker-compose.yml` already has the volume for requirements.txt - it will automatically install these during container build.

```bash
# Rebuild containers with new dependencies
docker-compose build

# Restart services
docker-compose up -d
```

## Dependency Size Impact

| Package | Size | Purpose |
|---------|------|---------|
| google-cloud-speech | 5 MB | Primary speech API |
| deepgram-sdk | 2 MB | Fallback speech API |
| openai-whisper | 1.3 GB | Offline transcription models |
| fuzzywuzzy | 50 KB | String matching |
| python-Levenshtein | 100 KB | Fast matching algorithm |
| **TOTAL** | **~1.3 GB** | Full installation |

**Note:** Most of the size is the Whisper model. If you want to use only cloud APIs (no offline), you can skip the whisper package and save ~1.3 GB.

## Production Optimization

### Option 1: Cloud APIs Only (Recommended for SaaS)

```bash
# Skip Whisper to save 1.3 GB
pip install \
  google-cloud-speech==2.21.0 \
  deepgram-sdk==3.0.0 \
  fuzzywuzzy==0.18.0 \
  python-Levenshtein==0.21.1

# Size: ~10 MB
# Cost: $0.006 per command
# Latency: 100-500ms
```

### Option 2: Offline First (Recommended for Fish Markets)

```bash
# Include Whisper for offline
pip install \
  openai-whisper==20240101 \
  fuzzywuzzy==0.18.0 \
  python-Levenshtein==0.21.1

# Size: ~1.3 GB
# Cost: $0 (computation only)
# Latency: 1-3 seconds
```

### Option 3: Hybrid (Recommended for Production)

```bash
# Use all providers with fallback chain
pip install \
  google-cloud-speech==2.21.0 \
  deepgram-sdk==3.0.0 \
  openai-whisper==20240101 \
  fuzzywuzzy==0.18.0 \
  python-Levenshtein==0.21.1

# Size: ~1.3 GB
# Cost: $0.006 per command (Google primary)
# Fallback to Deepgram ($0.0043/min) if Google fails
# Fallback to offline if network unavailable
```

## Requirements.txt Format

Here's how to organize your requirements.txt:

```ini
# Core Django & API
Django>=4.2
djangorestframework>=3.14
djangorestframework-simplejwt>=5.0
psycopg2-binary>=2.9

# Celery & Task Queue
celery>=5.3.0
redis>=5.0.0

# Voice Assistant Dependencies
# Speech Recognition
google-cloud-speech==2.21.0
deepgram-sdk==3.0.0
openai-whisper==20240101

# NLP & Text Processing
fuzzywuzzy==0.18.0
python-Levenshtein==0.21.1

# ... rest of your dependencies
```

## API Key Management

After installing dependencies, configure API keys:

```bash
# Create .env file
cat > .env << 'EOF'
VOICE_PRIMARY_PROVIDER=google
GOOGLE_SPEECH_API_KEY=your_google_key
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
EOF

# Load in Django settings
import os
os.environ.get('GOOGLE_SPEECH_API_KEY')
```

---

*Last Updated: May 26, 2024*
