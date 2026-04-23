-- Add unique constraint on medicine_batches to prevent duplicate batches
-- This ensures same medicine + batch_number + expiry_date combination is unique
ALTER TABLE public.medicine_batches
ADD CONSTRAINT unique_medicine_batch_expiry 
UNIQUE (medicine_id, batch_number, expiry_date);

-- Create a function to normalize and upsert medicine batches
-- This handles the "insert or update quantity" logic at database level
CREATE OR REPLACE FUNCTION public.upsert_medicine_batch(
  p_medicine_id UUID,
  p_batch_number TEXT,
  p_expiry_date DATE,
  p_quantity INTEGER,
  p_purchase_price NUMERIC,
  p_selling_price NUMERIC,
  p_mrp NUMERIC DEFAULT NULL,
  p_min_stock_level INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  was_updated BOOLEAN,
  new_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_quantity INTEGER;
  v_normalized_batch TEXT;
  v_new_quantity INTEGER;
BEGIN
  -- Normalize batch number: uppercase, trim, remove duplicate spaces
  v_normalized_batch := UPPER(TRIM(REGEXP_REPLACE(p_batch_number, '\s+', ' ', 'g')));
  
  -- Check if batch already exists
  SELECT mb.id, mb.quantity INTO v_existing_id, v_existing_quantity
  FROM public.medicine_batches mb
  WHERE mb.medicine_id = p_medicine_id
    AND UPPER(TRIM(REGEXP_REPLACE(mb.batch_number, '\s+', ' ', 'g'))) = v_normalized_batch
    AND mb.expiry_date = p_expiry_date;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing batch quantity
    v_new_quantity := v_existing_quantity + p_quantity;
    
    UPDATE public.medicine_batches
    SET quantity = v_new_quantity,
        purchase_price = p_purchase_price,
        selling_price = p_selling_price,
        mrp = COALESCE(p_mrp, mrp),
        min_stock_level = p_min_stock_level,
        updated_at = NOW()
    WHERE medicine_batches.id = v_existing_id;
    
    RETURN QUERY SELECT v_existing_id, TRUE, v_new_quantity;
  ELSE
    -- Insert new batch
    INSERT INTO public.medicine_batches (
      medicine_id, batch_number, expiry_date, quantity,
      purchase_price, selling_price, mrp, min_stock_level
    )
    VALUES (
      p_medicine_id, v_normalized_batch, p_expiry_date, p_quantity,
      p_purchase_price, p_selling_price, p_mrp, p_min_stock_level
    )
    RETURNING medicine_batches.id, FALSE, p_quantity INTO v_existing_id, was_updated, v_new_quantity;
    
    RETURN QUERY SELECT v_existing_id, FALSE, p_quantity;
  END IF;
END;
$$;