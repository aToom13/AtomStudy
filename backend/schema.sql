-- AtomStudy Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    grade TEXT,
    school TEXT,
    subscription TEXT DEFAULT 'Free' CHECK(subscription IN ('Free', 'Premium')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    daily_question_count INTEGER DEFAULT 0,
    total_questions_asked INTEGER DEFAULT 0,
    last_question_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject TEXT NOT NULL CHECK(subject IN ('Matematik', 'Fizik', 'Kimya', 'Biyoloji')),
    topic TEXT,
    question_text TEXT,
    question_image_url TEXT,
    solution TEXT,
    model_used TEXT NOT NULL,
    status TEXT DEFAULT 'success' CHECK(status IN ('success', 'error', 'pending')),
    response_time_ms INTEGER,
    cost_usd REAL,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI Models Table
CREATE TABLE IF NOT EXISTS ai_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'backup', 'disabled')),
    priority INTEGER DEFAULT 1,
    input_cost_per_1k REAL NOT NULL,
    output_cost_per_1k REAL NOT NULL,
    total_usage_count INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API Keys Table (Encrypted)
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT UNIQUE NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_used_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Table (Daily aggregates)
CREATE TABLE IF NOT EXISTS daily_analytics (
    date TEXT PRIMARY KEY,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    successful_questions INTEGER DEFAULT 0,
    failed_questions INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_priority ON ai_models(priority);

-- Insert default AI models
INSERT OR IGNORE INTO ai_models (name, provider, status, priority, input_cost_per_1k, output_cost_per_1k, description) VALUES
('gemini-3-pro-preview', 'Google', 'active', 1, 0.0025, 0.010, 'En gelişmiş model, karmaşık sorular için'),
('gemini-2.5-pro', 'Google', 'active', 2, 0.0015, 0.006, 'Dengeli performans ve maliyet'),
('gemini-2.5-flash', 'Google', 'active', 3, 0.0005, 0.002, 'Hızlı ve ekonomik'),
('gemini-1.5-flash', 'Google', 'backup', 4, 0.0003, 0.001, 'Yedek model');

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
('system_prompt', 'Sen deneyimli, sabırlı ve motive edici bir lise öğretmenisin. Görevin öğrencilere soru çözümünde rehberlik etmek.

ÖNEMLİ KURALLAR:
1. Kesinlikle sadece cevabı söyleme. Her zaman ADIM ADIM çöz.
2. Her adımı ayrı bir bölüm olarak yaz.
3. Formülleri LaTeX formatında yaz: $formül$
4. Türkçe yaz.
5. Cevabı makul uzunlukta tut, sonsuz döngüye girme.', 'AI system prompt'),
('free_daily_limit', '3', 'Ücretsiz kullanıcı günlük soru limiti'),
('premium_daily_limit', '100', 'Premium kullanıcı günlük soru limiti'),
('app_version', '1.0.0', 'Mobil uygulama versiyonu'),
('maintenance_mode', 'false', 'Bakım modu aktif mi?');
