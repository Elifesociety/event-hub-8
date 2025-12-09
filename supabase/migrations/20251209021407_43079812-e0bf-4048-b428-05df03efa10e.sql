-- Add new values to the app_module enum
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'survey';
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'stall_enquiry';