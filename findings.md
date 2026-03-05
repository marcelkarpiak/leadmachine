# Findings – IvoryLab Lead Machine

## API & Integracje
- Apify Actor: harvestapi/linkedin-profile-search
- Email enrichment: Hunter.io API
- Baza danych: Supabase (PostgreSQL)
- Auth: Supabase Auth (2 użytkowników: Marcel, Adrian)

## Odpowiedzi na pytania Discovery
1. **Widoczność:** Obydwaj użytkownicy mają widzieć wszystkie leady razem (RLS musi pozwalać na odczyt wszystkich w obrębie autoryzowanych). `user_id` w tabeli służy jedynie do przypisania, kto wyszukał leada.
2. **Listy a Sesje:** Sesja scrapingu może być przypisana do wielu list. (Zamiana prostej relacji `list_id` w sesjach na tabelę łączącą `session_lists`).
3. **Usuwanie z list:** Gdy lead zostaje usunięty z listy, zostaje całkowicie kasowany z bazy.
4. **Ręczne dodawanie:** Wymagane (poza procesem scrapingu).
5. **Konfiguracja scoringu:** Scoring ma być edytowalny z UI (potrzebna dodatkowa tabela `scoring_weights`).
6. **Branże priorytetowe:** finanse, usługi, ubezpieczenia, call centers, logistyka, healthcare, hotelarstwo itp.
7. **Limity sesji:** 50, 75, 100 itd. (jako parametr przyjmowany z UI).
8. **Błędy w sesji:** Wypisanie powodu braku wystarczającej ilości wprost do aplikacji.
9. **Powiadomienia:** E-mail po zakończeniu sesji scrapingu.

## Ograniczenia techniczne
[uzupełniaj w trakcie]

## Odkrycia i decyzje architektoniczne
1. Dodano tabele łączące `list_leads` i `session_lists`, aby obsłużyć relacje wiele-do-wielu dla list względem leadów oraz sesji.
2. Usunięto obostrzenie na RLS narzucające użytkownikom dostęp wyłącznie do ich zasobów. Wszyscy zautoryzowani pracownicy widzą wszystkie dane całej firmy IvoryLab.
