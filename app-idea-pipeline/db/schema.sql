-- app-idea-pipeline schema
-- raw_signals: unprocessed evidence pulled in by the collectors
CREATE TABLE IF NOT EXISTS raw_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,          -- reddit | app_store_chart | review | trends
    source_id TEXT NOT NULL,       -- source-specific unique id (post id, review id, etc.)
    title TEXT,
    body TEXT,
    url TEXT,
    metadata TEXT,                 -- JSON blob with source-specific extras
    collected_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (source, source_id)
);

-- ideas: signals that have been extracted + scored by the scorer
CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_signal_id INTEGER NOT NULL REFERENCES raw_signals(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    pain_point TEXT,
    target_user TEXT,
    market_size_score REAL,
    competition_score REAL,
    feasibility_score REAL,
    overall_score REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',   -- new | notified | archived
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ideas_status_score ON ideas (status, overall_score DESC);
