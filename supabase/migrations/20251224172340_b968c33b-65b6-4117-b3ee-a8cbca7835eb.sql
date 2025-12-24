-- Add product_number column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_number text;

-- Update existing products with sequential numbers (formatted as 001, 002, etc.)
WITH numbered_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.products
)
UPDATE public.products p
SET product_number = LPAD(np.row_num::text, 3, '0')
FROM numbered_products np
WHERE p.id = np.id;

-- Create a function to auto-generate product number for new products
CREATE OR REPLACE FUNCTION public.generate_product_number()
RETURNS TRIGGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(product_number AS INTEGER)), 0) INTO max_num FROM public.products WHERE product_number ~ '^\d+$';
  NEW.product_number := LPAD((max_num + 1)::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate product number on insert
DROP TRIGGER IF EXISTS set_product_number ON public.products;
CREATE TRIGGER set_product_number
  BEFORE INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.product_number IS NULL)
  EXECUTE FUNCTION public.generate_product_number();