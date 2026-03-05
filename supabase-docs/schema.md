# Database Schema Documentation

## Schema: `public`

### Table: `leads`
Storage for all acquired lead data.
- `id` (uuid, PK): Primary identifier.
- `full_name` (text): Lead's name.
- `job_title` (text): Professional position.
- `company_name` (text)
- `company_industry` (text)
- `email` (text): Primary contact point.
- `linkedin_url` (text, UNIQUE): Source profile URL.
- `score` (integer): Calculated lead quality score.
- `score_breakdown` (jsonb): Details of the scoring algorithm results.
- `session_id` (uuid, FK): Reference to the scraping session that created this lead.

### Table: `lists`
Groups for organizing leads.
- `id` (uuid, PK)
- `name` (text): List name.
- `status` (text): default 'active'.
- `created_at` (timestamptz)

### Table: `list_leads` (Junction)
Links leads to specific lists.
- `list_id` (uuid, PK, FK)
- `lead_id` (uuid, PK, FK)

### Table: `scraping_sessions`
Tracks the lifecycle of scraping runs.
- `id` (uuid, PK)
- `status` (text): `pending`, `running`, `completed`, `error`.
- `filters` (jsonb): Search parameters used.
- `target_count` (integer): Target number of leads.
- `collected_count` (integer): Progress counter.
- `error_message` (text): Captured failure details.

### Table: `session_lists` (Junction)
Links sessions to target lists where results should be saved.
- `session_id` (uuid, PK, FK)
- `list_id` (uuid, PK, FK)

### Table: `scoring_weights`
Configuration for the Lead Scoring engine.
- `key` (text, PK): Identifier (e.g., 'job_title_match').
- `value` (integer): Weight assigned to this factor.
- `description` (text): Human-readable explanation.

### Table: `api_keys`
Internal storage for third-party integration keys.
- `key` (text, PK): Service name (e.g., 'APIFY_TOKEN').
- `value` (text): Encrypted or plain value.
