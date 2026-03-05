# Project Constitution – IvoryLab Lead Machine

## Schemat danych

stworzony projekt w supabase: https://bovyvvxrxrdjuwhwhbxk.supabase.co

### Tabela: leads
| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid | Primary key |
| first_name | text | Imię |
| last_name | text | Nazwisko |
| full_name | text | Imię + nazwisko |
| job_title | text | Stanowisko |
| company_name | text | Nazwa firmy |
| company_size | text | Wielkość firmy (enum) |
| company_industry | text | Branża |
| email | text | Email (nullable) |
| phone | text | Telefon (nullable) |
| linkedin_url | text | URL profilu LinkedIn (unique) |
| score | integer | Scoring 0–100 |
| score_breakdown | jsonb | Szczegóły punktacji |
| session_id | uuid | FK → scraping_sessions.id (nullable - w razie ręcznego dodania) |
| source | text | Opcjonalnie: 'scraping', 'manual' |
| created_at | timestamptz | Data dodania |
| user_id | uuid | FK → auth.users.id (osoba, która znalazła/dodała) |

### Tabela: lists
| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid | Primary key |
| name | text | Nazwa listy |
| description | text | Opis (nullable) |
| status | text | active / archived |
| created_by | uuid | FK → auth.users.id |
| created_at | timestamptz | Data utworzenia |

### Tabela: list_leads (Łącząca: Leady na Listach)
| Kolumna | Typ | Opis |
|---|---|---|
| list_id | uuid | FK -> lists.id (ON DELETE CASCADE) |
| lead_id | uuid | FK -> leads.id (ON DELETE CASCADE) |
| added_at | timestamptz | Data dodania do listy |

*(Usunięcie z listy wyzwala trigger do usunięcia leada całkowicie w razie potrzeby bazy)*

### Tabela: scraping_sessions
| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid | Primary key |
| status | text | pending / running / completed / failed |
| filters | jsonb | Użyte filtry scrapingu |
| target_count | integer | Żądana liczba leadów |
| collected_count | integer | Faktycznie zebrane |
| emails_found | integer | Leady z emailem |
| error_message | text | Zapis błędów |
| started_at | timestamptz | Start sesji |
| finished_at | timestamptz | Koniec sesji (nullable) |
| user_id | uuid | FK → auth.users.id |

### Tabela: session_lists (Łącząca: Gdzie trafią leady z danej sesji)
| Kolumna | Typ | Opis |
|---|---|---|
| session_id | uuid | FK -> scraping_sessions.id (ON DELETE CASCADE) |
| list_id | uuid | FK -> lists.id (ON DELETE CASCADE) |

### Tabela: scoring_weights
| Kolumna | Typ | Opis |
|---|---|---|
| key | text | Primary Key | 
| value | integer | Ile punktów |
| description | text | Co oznacza |

## Reguły Scoringu (docelowo jako tabela scoring_weights)

| Kryterium | Punkty |
|---|---|
| Ma email | +30 |
| Ma telefon | +15 |
| Stanowisko CEO / Prezes / Właściciel | +20 |
| Stanowisko COO / CTO / Dyrektor | +15 |
| Stanowisko Head of Sales / Marketing | +10 |
| Firma 51–200 pracowników | +15 |
| Firma 201–500 pracowników | +20 |
| Firma 500+ pracowników | +10 |
| Branża priorytetowa (finanse, healthcare, ubezpieczenia, e-commerce, usługi itp.) | +20 |
| Publiczny profil LinkedIn | +5 |

**Skala:** 0–39 = 🔴 Cold | 40–69 = 🟡 Warm | 70–100 = 🟢 Hot

## Niezmienniki architektoniczne (NIGDY nie łam tych reguł)
1. Warstwy A.N.T. są zawsze oddzielone – Acquisition nigdy nie zapisuje do bazy
2. Duplikaty są wykrywane po `linkedin_url` ORAZ `email` (jeśli nie null)
3. Brak emaila nie blokuje zapisu leada
4. Scoring jest obliczany zawsze według tabeli z tego pliku (bądź z tabeli scoring_weights) – bez wyjątków
5. Każda sesja scrapingu ma swój rekord w `scraping_sessions` zanim ruszy
6. CSV eksportuje kolumny w tej kolejności: full_name, job_title, company_name, company_size, company_industry, email, phone, linkedin_url, score, created_at
7. **RLS w Supabase – każdy autoryzowany użytkownik widzi wszystkie dane zebrane przez cały zespół.**
