# Voice Assistant - Database Schema

## Overview

The Voice Assistant system stores the following data:

1. **VoiceSession** - User recording sessions
2. **VoiceCommand** - Individual voice commands  
3. **VoiceTranscript** - Transcription metadata
4. **FishNameAlias** - Fish name mapping (Tamil/English/Tanglish)
5. **VoiceCommandQueue** - Offline command queue
6. **VoiceSettings** - User preferences
7. **VoiceAnalytics** - Usage analytics

## ER Diagram

```
User (1) ─────────────── (M) VoiceSession
                           │
                           └─── (M) VoiceCommand
                                   │
                                   ├─── VoiceTranscript (1-to-1)
                                   └─── VoiceCommandQueue (1-to-1, optional)

Company (1) ───────────── (M) VoiceSession
            ────────────── (M) FishNameAlias
            ────────────── (M) VoiceSettings
            ────────────── (M) VoiceAnalytics

Fish (1) ────────────── (M) FishNameAlias
```

## Table: VoiceSession

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | FK | Foreign key to User |
| company_id | FK | Foreign key to Company |
| language | CharField | Primary language (tamil, english, hindi, tanglish, mixed) |
| language_detected | CharField | Auto-detected language |
| status | CharField | active, completed, failed, paused |
| start_time | DateTime | Session start |
| end_time | DateTime | Session end (null if ongoing) |
| total_commands | Int | Count of commands |
| successful_commands | Int | Count of successful commands |
| failed_commands | Int | Count of failed commands |
| conversation_context | JSON | Stores conversation state for multi-turn |
| ip_address | IPv4/IPv6 | Client IP |
| user_agent | Text | Client browser info |
| created_at | DateTime | Record creation |
| updated_at | DateTime | Record update |

**Indexes:** (user, company), (company, created_at), (user, created_at)

## Table: VoiceCommand

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | FK | Foreign key to VoiceSession |
| audio_file_path | CharField | Path to encrypted audio file |
| audio_duration_seconds | Float | Recording length |
| audio_size_bytes | Int | File size |
| audio_hash | CharField | SHA256 for deduplication |
| transcript_raw | Text | Raw transcription from provider |
| transcript_cleaned | Text | Normalized transcription |
| extracted_entities | JSON | Extracted fields (fish, quantity, rate, etc.) |
| entity_confidence_scores | JSON | Confidence for each entity (0-100) |
| overall_confidence | Float | Average confidence (0-100) |
| form_type | CharField | purchase, sale, payment, inventory, inquiry |
| status | CharField | recording, transcribed, extracted, confirmed, saved, failed |
| speech_provider | CharField | google, deepgram, openai, whisper, azure |
| speech_provider_response_time_ms | Int | API response time |
| nlp_provider | CharField | claude, gpt4, llama, rule_based |
| nlp_response_time_ms | Int | NLP processing time |
| speech_provider_cost | Decimal | USD cost for speech |
| nlp_provider_cost | Decimal | USD cost for NLP |
| error_message | Text | Error details if failed |
| error_type | CharField | Error classification |
| user_correction | Text | User's correction text |
| created_at | DateTime | Record creation |
| updated_at | DateTime | Record update |

**Indexes:** (session, created_at), (status, created_at), (audio_hash)

## Table: VoiceTranscript

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| command_id | FK (1-to-1) | Foreign key to VoiceCommand |
| provider | CharField | Speech provider used |
| provider_confidence | Float | Provider confidence score (0-1.0) |
| alternatives | JSON | List of alternative transcriptions |
| processing_time_ms | Int | Processing duration |
| cost | Decimal | Provider cost in USD |
| language_detected | CharField | Auto-detected language |
| provider_response | JSON | Raw provider response |
| created_at | DateTime | Record creation |

**Indexes:** (created_at)

## Table: FishNameAlias

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| company_id | FK | Foreign key to Company |
| normalized_name | CharField | Canonical name (e.g., "Vanjaram") |
| english_name | CharField | English translation |
| tamil_name | CharField | Tamil name |
| aliases | Array | All known variations |
| fish_id | FK (optional) | Link to Fish model |
| usage_count | Int | Times used for learning |
| last_used | DateTime | Most recent usage |
| is_active | Boolean | Active flag |
| created_at | DateTime | Record creation |
| updated_at | DateTime | Record update |

**Unique:** (company, normalized_name)
**Indexes:** (company, normalized_name), (company, usage_count)

## Table: VoiceCommandQueue

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | FK | Foreign key to User |
| company_id | FK | Foreign key to Company |
| audio_data | Binary | Encrypted audio data |
| audio_hash | CharField | SHA256 for deduplication |
| metadata | JSON | Recording metadata |
| status | CharField | queued, processing, synced, failed |
| retry_count | Int | Number of sync attempts |
| last_retry | DateTime | Last retry timestamp |
| next_retry | DateTime | Scheduled retry time |
| synced_command_id | FK (optional) | Link to synced VoiceCommand |
| error_message | Text | Sync error details |
| created_at | DateTime | Record creation |
| updated_at | DateTime | Record update |

**Indexes:** (user, status), (company, status)

## Table: VoiceSettings

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | FK (1-to-1) | Foreign key to User |
| company_id | FK | Foreign key to Company |
| primary_language | CharField | Default language |
| secondary_language | CharField | Fallback language |
| voice_gender | CharField | female, male, neutral |
| voice_speed | Float | Speed multiplier (0.5-2.0) |
| mic_sensitivity | Float | Mic gain (0.5-2.0) |
| noise_cancellation_enabled | Boolean | Noise filter |
| auto_save_enabled | Boolean | Auto-save low-confidence |
| auto_save_confidence_threshold | Float | Threshold for auto-save |
| require_confirmation | Boolean | Always ask before save |
| confidence_threshold | Float | Ask clarification if below |
| max_recording_duration | Int | Max seconds |
| auto_stop_silence_duration | Int | Stop after N seconds silent |
| store_audio | Boolean | Store for improvement |
| auto_delete_audio_days | Int | Delete audio after N days |
| large_ui | Boolean | Accessibility |
| high_contrast | Boolean | Accessibility |
| is_active | Boolean | Active flag |
| created_at | DateTime | Record creation |
| updated_at | DateTime | Record update |

**Unique:** (user, company)

## Table: VoiceAnalytics

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | FK | Foreign key to User |
| company_id | FK | Foreign key to Company |
| date | Date | Analytics date |
| total_commands | Int | Total commands that day |
| successful_commands | Int | Successful commands |
| failed_commands | Int | Failed commands |
| average_confidence | Float | Avg confidence (0-1.0) |
| average_response_time_ms | Int | Avg API response time |
| total_audio_duration_seconds | Float | Total recording time |
| total_cost | Decimal | Daily API cost |
| form_type_breakdown | JSON | Commands by form type |
| language_breakdown | JSON | Commands by language |
| most_common_error | CharField | Most frequent error |
| created_at | DateTime | Record creation |

**Unique:** (user, company, date)
**Indexes:** (company, date), (user, date)

## Creating Migrations

Generate migrations after model changes:

```bash
# Create migration files
python manage.py makemigrations voice

# Review migration SQL
python manage.py sqlmigrate voice 0001

# Apply migrations
python manage.py migrate voice
```

## Database Optimization Tips

### 1. Index Strategy
- Indexes on foreign keys (auto-created)
- Indexes on frequently filtered fields (status, created_at)
- Partial index on active sessions

### 2. Query Optimization
- Use `select_related()` for FK lookups
- Use `prefetch_related()` for M2M relationships
- Use `.values()` to fetch specific columns

```python
# Example: Get session with latest commands
session = VoiceSession.objects.select_related('user', 'company').get(id=...)
commands = session.commands.all()[:10]
```

### 3. Archiving Old Data
```python
# Archive old analytics (keep last 90 days)
from django.utils import timezone
from datetime import timedelta

cutoff_date = timezone.now().date() - timedelta(days=90)
VoiceAnalytics.objects.filter(date__lt=cutoff_date).delete()
```

### 4. Cleanup Old Audio
```python
# Run periodically to delete old audio files
from django.utils import timezone
from datetime import timedelta

cutoff_date = timezone.now() - timedelta(days=30)
old_commands = VoiceCommand.objects.filter(created_at__lt=cutoff_date)

for cmd in old_commands:
    # Delete audio file from storage
    if cmd.audio_file_path:
        delete_audio_file(cmd.audio_file_path)
    cmd.audio_file_path = None
    cmd.save()
```

## Backup Strategy

### Regular Backups
```bash
# Dump voice tables
pg_dump -t "voice_*" fisherp_db > voice_backup.sql

# Restore
psql fisherp_db < voice_backup.sql
```

### Audio File Backups
```bash
# Sync S3 backups
aws s3 sync s3://audio-bucket/backup/ ./audio-backup/ --delete
```

---

*Last Updated: May 26, 2024*
