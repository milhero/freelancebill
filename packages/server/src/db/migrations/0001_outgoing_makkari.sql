ALTER TYPE "public"."invoice_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'other' NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "tax_free_allowance" SET DEFAULT '12348.00';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reminder_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "last_reminder_date" varchar(10);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "service_date" varchar(10);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "service_period_start" varchar(10);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "service_period_end" varchar(10);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tax_mode" varchar(20) DEFAULT 'kleinunternehmer' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT '19.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tax_id" varchar(50);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "vat_id" varchar(50);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "invoice_template" varchar(30) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "invoice_accent_color" varchar(7) DEFAULT '#1a1a2e' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;