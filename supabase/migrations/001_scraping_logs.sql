-- Tabela logów scrapingu dla realtime progress w LiveLogTerminal
CREATE TABLE scraping_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES scraping_sessions(id) ON DELETE CASCADE,
    message text NOT NULL,
    type text DEFAULT 'info',  -- info | success | working | error | warning
    created_at timestamptz DEFAULT now()
);

-- Indeks dla szybkiego filtrowania po sesji
CREATE INDEX idx_scraping_logs_session_id ON scraping_logs(session_id);

-- RLS
ALTER TABLE scraping_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON scraping_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role insert" ON scraping_logs FOR INSERT TO service_role WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE scraping_logs;
