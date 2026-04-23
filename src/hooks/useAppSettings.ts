import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type PharmacyProfile = Tables<'pharmacy_profile'>;

export interface AppSettings {
  vatRate: number;
  vatRatePercent: number;
  invoicePrefix: string;
  purchasePrefix: string;
  currency: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  vatRate: 0.13,
  vatRatePercent: 13,
  invoicePrefix: 'INV',
  purchasePrefix: 'PUR',
  currency: 'NPR',
};

const cleanString = (raw: unknown, fallback: string) => {
  if (raw === null || raw === undefined) return fallback;
  return String(raw).replace(/^"|"$/g, '').trim() || fallback;
};

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async (): Promise<AppSettings> => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['vat_rate', 'invoice_prefix', 'purchase_prefix', 'currency']);
      const map = new Map<string, unknown>();
      (data || []).forEach((row) => map.set(row.key, row.value));

      const vatRaw = cleanString(map.get('vat_rate'), '13');
      const vatNum = Number(vatRaw);
      const vatPercent = Number.isFinite(vatNum) ? vatNum : 13;

      return {
        vatRate: vatPercent / 100,
        vatRatePercent: vatPercent,
        invoicePrefix: cleanString(map.get('invoice_prefix'), 'INV'),
        purchasePrefix: cleanString(map.get('purchase_prefix'), 'PUR'),
        currency: cleanString(map.get('currency'), 'NPR'),
      };
    },
    staleTime: 60 * 1000,
    placeholderData: DEFAULT_SETTINGS,
  });
}

export function usePharmacyProfile() {
  return useQuery({
    queryKey: ['pharmacy-profile'],
    queryFn: async (): Promise<PharmacyProfile | null> => {
      const { data } = await supabase.from('pharmacy_profile').select('*').maybeSingle();
      return data ?? null;
    },
    staleTime: 60 * 1000,
  });
}
