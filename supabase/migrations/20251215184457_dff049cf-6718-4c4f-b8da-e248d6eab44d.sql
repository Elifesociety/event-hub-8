-- Add panchayath_id to stalls table
ALTER TABLE public.stalls 
ADD COLUMN panchayath_id uuid REFERENCES public.panchayaths(id);

-- Create index for better query performance
CREATE INDEX idx_stalls_panchayath_id ON public.stalls(panchayath_id);