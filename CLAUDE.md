# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IvoryLab Lead Machine — a B2B lead generation SaaS platform built with Next.js and Supabase. Scrapes LinkedIn profiles via Apify, enriches with Hunter.io emails, scores leads dynamically, and manages them through a dashboard UI.

## Commands

All commands run from `web/` directory:

```bash
cd web
npm run dev      # Next.js dev server
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Production server
```

Supabase Edge Functions are deployed separately via `supabase functions deploy <function-name>` from the repo root.

## Architecture: A.N.T. Pipeline

The core architecture follows three separated layers — **Acquisition → Normalization → Transport**:

1. **Acquisition** (`supabase/functions/acquisition-apify/`) — Calls Apify LinkedIn scraper, returns raw profiles. Never writes to DB directly.
2. **Normalization** (`supabase/functions/normalization-service/`) — Enriches emails via Hunter.io, calculates lead scores from `scoring_weights` table, detects duplicates by `linkedin_url` + `email`.
3. **Transport** (`supabase/functions/transport-service/`) — Batch inserts to `leads` table, maps to `list_leads` junction, sends completion email, updates session status.

**Invariant**: These layers must stay separated. Acquisition never writes to the database.

## Web App Structure (`web/src/`)

- **App Router** with two route groups: `(auth)` for login, `(dashboard)` for protected pages
- **Middleware** (`middleware.ts`) redirects unauthenticated users to `/login`
- **Supabase clients**: `lib/supabaseClient.ts` (browser), `lib/supabaseServer.ts` (server/RSC with cookies)
- **Path alias**: `@/*` maps to `./src/*`

### Key Pages
- `/` — Dashboard with KPI cards
- `/scraping` — A.N.T. scraping interface with LiveLogTerminal
- `/lists` and `/lists/[id]` — List management
- `/contacts` — All leads view
- `/settings` — API keys, scoring weight configuration

## Database Schema

Core tables: `leads`, `lists`, `list_leads` (M:N junction), `scraping_sessions`, `session_lists` (M:N junction), `scoring_weights`.

- RLS policy: all authorized users see all company data (team-wide visibility)
- Duplicates detected by `linkedin_url` + `email`
- Scoring scale: 0-39 Cold, 40-69 Warm, 70-100 Hot
- CSV export column order: full_name, job_title, company_name, company_size, company_industry, email, phone, linkedin_url, score, created_at

Full schema and scoring rules are documented in `project.md`.

## Tech Stack

- Next.js 16 / React 19 / TypeScript 5
- Tailwind CSS 4 with custom design tokens in `globals.css`
- Supabase (PostgreSQL + Auth + Edge Functions in Deno)
- Fonts: DM Sans (display), Inter (sans), DM Mono (mono)

## Design System

Color tokens and shadows are defined in `web/src/app/globals.css` — accent (#2563EB), success, warning, danger variants with card/popover/modal shadow presets and gradient utilities.
