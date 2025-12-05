-- First, update existing data to use new role values (map old to new)
UPDATE team_members SET role = 'volunteer' WHERE role = 'volunteer';
UPDATE team_members SET role = 'admin' WHERE role = 'admin';
UPDATE team_members SET role = 'official' WHERE role = 'official';

-- Create new enum type
CREATE TYPE public.team_role_new AS ENUM ('administration', 'volunteer', 'stage_crew', 'stall_crew');

-- Add a temporary column with the new enum type
ALTER TABLE team_members ADD COLUMN role_new team_role_new;

-- Migrate data (map old roles to new)
UPDATE team_members SET role_new = 
  CASE role::text
    WHEN 'admin' THEN 'administration'::team_role_new
    WHEN 'official' THEN 'administration'::team_role_new
    WHEN 'volunteer' THEN 'volunteer'::team_role_new
    ELSE 'volunteer'::team_role_new
  END;

-- Drop the old column and rename the new one
ALTER TABLE team_members DROP COLUMN role;
ALTER TABLE team_members RENAME COLUMN role_new TO role;

-- Set default and not null constraint
ALTER TABLE team_members ALTER COLUMN role SET DEFAULT 'volunteer'::team_role_new;
ALTER TABLE team_members ALTER COLUMN role SET NOT NULL;

-- Drop old enum type and rename new one
DROP TYPE public.team_role;
ALTER TYPE public.team_role_new RENAME TO team_role;