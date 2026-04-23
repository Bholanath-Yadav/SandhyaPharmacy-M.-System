import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BatchUpsertParams {
  medicine_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  mrp?: number;
  min_stock_level?: number;
}

export interface BatchUpsertResult {
  id: string;
  was_updated: boolean;
  new_quantity: number;
}

/**
 * Normalizes input text: uppercase, trim, remove duplicate spaces
 */
export const normalizeText = (text: string): string => {
  return text.toUpperCase().trim().replace(/\s+/g, ' ');
};

/**
 * Upserts a medicine batch - if exists, updates quantity; otherwise creates new
 * Shows appropriate toast messages
 */
export const upsertMedicineBatch = async (
  params: BatchUpsertParams
): Promise<BatchUpsertResult | null> => {
  try {
    const { data, error } = await supabase.rpc('upsert_medicine_batch', {
      p_medicine_id: params.medicine_id,
      p_batch_number: params.batch_number,
      p_expiry_date: params.expiry_date,
      p_quantity: params.quantity,
      p_purchase_price: params.purchase_price,
      p_selling_price: params.selling_price,
      p_mrp: params.mrp ?? null,
      p_min_stock_level: params.min_stock_level ?? 10,
    });

    if (error) throw error;

    const result = data?.[0];
    if (!result) throw new Error('No result returned');

    if (result.was_updated) {
      toast.success(`Batch exists. Quantity updated to ${result.new_quantity}`);
    } else {
      toast.success('New batch added successfully');
    }

    return {
      id: result.id,
      was_updated: result.was_updated,
      new_quantity: result.new_quantity,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save batch';
    toast.error(message);
    return null;
  }
};

/**
 * Checks if a batch already exists for the given medicine + batch number + expiry
 */
export const checkBatchExists = async (
  medicineId: string,
  batchNumber: string,
  expiryDate: string
): Promise<{ exists: boolean; batchId?: string; currentQuantity?: number }> => {
  const normalizedBatch = normalizeText(batchNumber);
  
  const { data, error } = await supabase
    .from('medicine_batches')
    .select('id, quantity, batch_number')
    .eq('medicine_id', medicineId)
    .eq('expiry_date', expiryDate);

  if (error || !data) {
    return { exists: false };
  }

  // Find matching batch with normalized comparison
  const matchingBatch = data.find(
    b => normalizeText(b.batch_number) === normalizedBatch
  );

  if (matchingBatch) {
    return {
      exists: true,
      batchId: matchingBatch.id,
      currentQuantity: matchingBatch.quantity,
    };
  }

  return { exists: false };
};
