# Progress – IvoryLab Lead Machine

## Format wpisu
### [2026-03-05] – [Faza 0: Discovery]
- ✅ Założono repozytorium dokumentacji protokołu (task_plan, findings, progress, project)
- ✅ Przeanalizowano odpowiedzi na pytania Discovery udzielone w pierwszym prompcie.
- ✅ Zaktualizowano schemat danych w project.md aby sprostać nowym wymaganiom (widoczność, tabele łączące, relacje M:N).
- 📌 Następny krok: Oczekiwanie na słowa "Możesz zacząć budować" od użytkownika rozjemcy.

### [2026-03-05] – [Faza 1: Konfiguracja Supabase]
- ✅ Wykonano skrypt SQL tworzący struktury tabel: `leads`, `lists`, `list_leads`, `scraping_sessions`, `session_lists`, `scoring_weights`.
- ✅ Ustawiono podstawowe polityki Row Level Security (RLS) udostępniające pełen dostęp dla wszystkich zweryfikowanych użytkowników.
- ✅ Zasilono tabelę `scoring_weights` domyślnymi wagami.
- 📌 Następny krok: Oczekiwanie na polecenie rozpoczęcia Fazy 2 (Acquisition - integracja z Apify).

### [2026-03-05] – [Faza 2: Warstwa Acquisition]
- ✅ Zaprojektowano flow Acquisition (utworzono lokalnie `acquisition-apify/index.ts` oraz `deno.json`).
- ✅ Wdrożono (deployed) Edge Function na środowisko produkcyjne Supabase.
- ✅ Funkcja odbiera parametry sesji, rejestruje event na Apify i czeka na jsonowy rezultat, przekazując pobrane surowe profile bez zapisywania do tabel, zgodnie z pryncypiami *Acquisition Layer*.
- 📌 Następny krok: Autoryzacja Fazy 3 (Normalization - scoring, Hunter.io).

### [2026-03-05] – [Faza 3: Warstwa Normalization]
- ✅ Zebrano założenia i napisano skrypt Edge Function `normalization-service` (TypeScript).
- ✅ Zaimplementowano asynchroniczny limit requestów `await new Promise(r => setTimeout(r, 200))` pod API Hunter.io dla zapytań o e-mail by nie naruszać zasady rate limitingu.
- ✅ Zbudowano wyliczanie score na podstawie dynamicznych wag z tabeli `scoring_weights`.
- ✅ Utworzono szybki mechanizm deduplikacji po istniejących `linkedin_url` i e-mailach.
- 📌 Następny krok: Autoryzacja do wejścia w Fazę 4 (Transport, zapis, eksport CSV).

### [2026-03-05] – [Faza 4: Warstwa Transport]
- ✅ Zaprojektowano plik `transport-service` integrujący dane odrzucone-niezduplikowane do bazy `leads` (`batch insert`).
- ✅ Kod aktualizuje relacje list `list_leads` i markuje flagę w sesjach na `completed`.
- ✅ Wpięto bibliotekę `SmtpClient` w Deno z logowaniem po stronie cyber-folks (dane SMTP użytkownika).
- ✅ Zdeployowano 3. z kolei Edge Function, kończąc backendowe filary A.N.T.
- 📌 Następny krok: Autoryzacja Fazy 5 (Rozpoczęcie budowy projektu Next.js dla panelu UI: Dashboard i Listy Kontakty).

### [2026-03-05] – [Faza 5: UI – Dashboard + Listy + Kontakty]
- ✅ Zainicjowano projekt Next.js (App Router, Tailwind v4, ts) w podfolderze `/web`.
- ✅ Utworzono definicje w CSS (`globals.css`) wdrażające wytyczne z `design-guidelines` ("Corporate Clarity & Refined Minimalism").
- ✅ Zbudowano układ wielokrotnego użytku: `Sidebar`, `StatsCard`, generyczny `DataTable`, `Badge`.
- ✅ Utworzono makiety ekranów: `/` (Dashboard), `/contacts` (Wszystkie kontakty), `/lists` (Zarządzanie listami) oraz `/lists/[id]` (Szczegóły listy).
- 📌 Następny krok: Autoryzacja Fazy 6 (Wdrożenie inteligentnego UI dla Panelu Scrapingu oraz ustawienia konfiguracyjne pożądanych wag i filtrów).

### [2026-03-05] – [Faza 6: UI – Panel Scrapingu]
- ✅ Zbudowano komponent `ChipInput` do parametryzacji stanowisk i fraz.
- ✅ Stworzono animowany w React `LiveLogTerminal` pozwalający symulować przepływ B.L.A.S.T.
- ✅ Złożono gotową stronę `/scraping` do monitorowania potoku w estetyce "Corporate Clarity".
- 📌 Następny krok: Autoryzacja Fazy 7 (UI konfiguracji Supabase: wagi scoringowe, klucze API).

### [2026-03-05] – [Faza 7: UI – Ustawienia]
- ✅ Zaprojektowano podstronę `/settings` zachowując "Corporate Clarity".
- ✅ Dodano bezpieczne formularze konfiguracyjne dla Apify, Huntera oraz serwera SMTP wraz ze stanem ładowania (Toast).
- ✅ Zaimplementowano czytelną tabelę zarządzania wszystkimi zdefiniowanymi "Wagami Scoringowymi" (points).
- 📌 Następny krok: Autoryzacja **Finałowej Fazy 8** (Testy E2E, Deployment i fizyczna komunikacja z Supabase).
