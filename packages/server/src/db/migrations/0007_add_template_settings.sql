ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_template VARCHAR(30) DEFAULT 'standard';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_accent_color VARCHAR(7) DEFAULT '#1a1a2e';
