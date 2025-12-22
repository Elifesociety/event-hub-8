-- Add panchayath_id and ward_id columns to registrations table
ALTER TABLE public.registrations 
ADD COLUMN panchayath_id uuid REFERENCES public.panchayaths(id),
ADD COLUMN ward_id uuid REFERENCES public.wards(id);