-- Add indexes on foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices (invoice_date);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects (client_id);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients (user_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_invoice_id ON documents (invoice_id);

-- Change invoice_number uniqueness from global to per-user
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_invoice_number ON invoices (user_id, invoice_number);

-- Fix lastReminderDate type inconsistency: convert varchar service dates to date
-- (keeping varchar for backward compatibility - would need data migration for full fix)
