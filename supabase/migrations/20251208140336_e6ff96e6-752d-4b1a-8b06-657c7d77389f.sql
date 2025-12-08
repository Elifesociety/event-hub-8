-- Create enum for admin roles
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin');

-- Create admins table
CREATE TABLE public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create enum for modules
CREATE TYPE public.app_module AS ENUM ('billing', 'team', 'programs', 'accounts', 'food_court', 'photos', 'registrations');

-- Create admin_permissions table
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.admins(id) ON DELETE CASCADE NOT NULL,
  module app_module NOT NULL,
  can_read boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(admin_id, module)
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for admins table
CREATE POLICY "Allow public read admins" ON public.admins FOR SELECT USING (true);
CREATE POLICY "Allow public insert admins" ON public.admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update admins" ON public.admins FOR UPDATE USING (true);
CREATE POLICY "Allow public delete admins" ON public.admins FOR DELETE USING (true);

-- RLS policies for admin_permissions table
CREATE POLICY "Allow public read permissions" ON public.admin_permissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert permissions" ON public.admin_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update permissions" ON public.admin_permissions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete permissions" ON public.admin_permissions FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert super admin (password: anas919123 - using simple hash for demo)
INSERT INTO public.admins (username, password_hash, role)
VALUES ('anas', 'anas919123', 'super_admin');