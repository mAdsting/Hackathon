ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_days INTEGER DEFAULT 2;

-- Add notification preferences to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"sms": true, "whatsapp": true, "email": true}'::jsonb;
