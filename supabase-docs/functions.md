# Supabase Edge Functions

The project utilizes Deno-based Edge Functions to handle external API integrations and heavy processing.

## 1. `acquisition-apify`
- **Purpose:** Orchestrates the scraping process using Apify actors.
- **Workflow:**
    - Triggered by the UI with a `sessionId`.
    - Updates `scraping_sessions` status to `running`.
    - Calls Apify API with search filters.
    - Streams logs back to the database.

## 2. `normalization-service`
- **Purpose:** Processes raw data from scraping sessions.
- **Workflow:**
    - Cleans input data.
    - Performs lead scoring based on `scoring_weights`.
    - Integrates with Hunter.io or other enrichment services.

## 3. `transport-service`
- **Purpose:** Final stage of the pipeline.
- **Workflow:**
    - Moves processed leads into the final storage.
    - Handles CSV/Excel exports.
    - Manages record deduplication.

## Security Note
All functions are configured with `verify_jwt: false` for internal orchestration (service-to-service), but entry points should be secured via standard Supabase Auth when called from the client.
