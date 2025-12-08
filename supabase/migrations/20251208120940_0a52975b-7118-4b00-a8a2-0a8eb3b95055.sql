-- Drop the existing check constraint
ALTER TABLE public.billing_transactions DROP CONSTRAINT IF EXISTS billing_transactions_status_check;

-- Add updated check constraint that includes 'delivered'
ALTER TABLE public.billing_transactions 
ADD CONSTRAINT billing_transactions_status_check 
CHECK (status IN ('pending', 'paid', 'delivered'));