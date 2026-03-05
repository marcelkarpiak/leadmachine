# Security & Extensions

## Row Level Security (RLS)
Security is strictly enforced on all public tables. Access is primarily granted to `authenticated` users.

### Policies Summary
- **Leads:** Full access for `authenticated` roles.
- **Lists & Junctions:** Full access for `authenticated` roles.
- **Scraping Sessions:** Full access for `authenticated` roles.
- **API Keys:**
    - `authenticated`: Full access (for admin UI management).
    - `service_role`: Select access for internal function execution.

## Database Extensions
The following core extensions are enabled to support project functionality:

- **pgcrypto:** Used for cryptographic functions and password hashing.
- **uuid-ossp:** Standard UUID generation support.
- **pg_graphql:** Enables the automatic GraphQL API.
- **supabase_vault:** Secure storage for sensitive secrets.
- **pg_stat_statements:** Performance monitoring and query statistics.

## Auth Configuration
- **Provider:** Email/Password enabled.
- **Schema:** Managed in the `auth` schema.
- **User Record:** Links to `public` schema tables via `user_id`.
