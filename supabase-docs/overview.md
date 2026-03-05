# Supabase Project Overview: IvoryLab Lead Machine

## Project Identity
- **Project Name:** lead-machine
- **Project Ref:** `bovyvvxrxrdjuwhwhbxk`
- **Region:** eu-west-1 (Ireland)
- **Status:** ACTIVE_HEALTHY

## Database Engine
- **Type:** PostgreSQL 17
- **Version:** 17.6.1.063
- **Release Channel:** GA

## Infrastructure Components
- **Database (PostgreSQL):** Relational storage with RLS protection.
- **Edge Functions (Deno):** Serverless functions for business logic and integrations.
- **Auth (GoTrue):** User management and session handling.
- **Realtime:** Real-time updates for logs and session statuses.

## Environment & Access
The project is configured to work with a Next.js frontend using `@supabase/ssr` for authentication and data fetching. Security is enforced via Row Level Security (RLS) policies targeting `authenticated` users.
