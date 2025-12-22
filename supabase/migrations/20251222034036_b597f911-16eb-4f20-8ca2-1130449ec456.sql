-- Create help_requests table for stall enquiry help
CREATE TABLE public.stall_enquiry_help_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  mobile TEXT,
  message TEXT DEFAULT 'Need help with stall enquiry',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.stall_enquiry_help_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read help_requests" 
ON public.stall_enquiry_help_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert help_requests" 
ON public.stall_enquiry_help_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update help_requests" 
ON public.stall_enquiry_help_requests 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete help_requests" 
ON public.stall_enquiry_help_requests 
FOR DELETE 
USING (true);