-- Fix function search path for generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT value::TEXT INTO prefix FROM public.settings WHERE key = 'invoice_prefix';
  prefix := COALESCE(REPLACE(prefix, '"', ''), 'INV');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(prefix) + 2) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.sales_invoices
  WHERE invoice_number LIKE prefix || '-%';
  
  result := prefix || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$$;