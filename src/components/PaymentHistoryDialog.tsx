import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CreditCard, Calendar, Banknote, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Customer = Tables<'customers'>;
type Payment = Tables<'payments'>;

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number | null;
  due_amount: number | null;
  created_at: string;
  payment_method: string | null;
}

type HistoryItem = {
  id: string;
  type: 'invoice' | 'payment';
  date: string;
  description: string;
  amount: number;
  method: string | null;
  reference?: string;
  dueChange?: number;
};

export function PaymentHistoryDialog({ open, onOpenChange, customer }: PaymentHistoryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (open && customer) {
      fetchHistory();
    }
  }, [open, customer]);

  const fetchHistory = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      // Fetch invoices for this customer
      const { data: invoices, error: invoicesError } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, total_amount, paid_amount, due_amount, created_at, payment_method')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch payments for this customer
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('reference_id', customer.id)
        .eq('payment_type', 'due_payment')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Combine and sort
      const historyItems: HistoryItem[] = [];

      // Add invoices
      (invoices || []).forEach((inv: InvoiceRecord) => {
        historyItems.push({
          id: inv.id,
          type: 'invoice',
          date: inv.created_at,
          description: `Invoice #${inv.invoice_number}`,
          amount: inv.total_amount,
          method: inv.payment_method,
          reference: inv.invoice_number,
          dueChange: inv.due_amount || 0,
        });
      });

      // Add payments
      (payments || []).forEach((pmt: Payment) => {
        historyItems.push({
          id: pmt.id,
          type: 'payment',
          date: pmt.created_at,
          description: 'Due Payment Received',
          amount: pmt.amount,
          method: pmt.payment_method,
          reference: pmt.reference_number || undefined,
          dueChange: -(pmt.amount),
        });
      });

      // Sort by date descending
      historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(historyItems);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'Cash';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Payment History
          </DialogTitle>
          {customer && (
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium">{customer.name}</p>
                {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className={`text-lg font-bold ${(customer.current_balance || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  NPR {(customer.current_balance || 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No transaction history found</p>
              <p className="text-xs text-muted-foreground mt-1">Invoices and payments will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3 p-3 rounded-lg border transition-colors ${
                    item.type === 'payment'
                      ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30'
                      : 'bg-card'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === 'payment'
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : 'bg-primary/10'
                  }`}>
                    {item.type === 'payment' ? (
                      <ArrowDownCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.date), 'MMM dd, yyyy h:mm a')}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-semibold ${item.type === 'payment' ? 'text-green-600' : ''}`}>
                          {item.type === 'payment' ? '+' : ''} NPR {item.amount.toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-[10px] mt-1">
                          <CreditCard className="h-2.5 w-2.5 mr-1" />
                          {formatPaymentMethod(item.method)}
                        </Badge>
                      </div>
                    </div>
                    
                    {item.type === 'invoice' && (item.dueChange || 0) > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed">
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Due added: NPR {item.dueChange?.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Summary footer */}
        {!loading && history.length > 0 && (
          <div className="border-t pt-3 mt-2 -mx-6 px-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Invoices:</span>
              <span className="font-medium">{history.filter(h => h.type === 'invoice').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Payments:</span>
              <span className="font-medium text-green-600">{history.filter(h => h.type === 'payment').length}</span>
            </div>
            <div className="flex justify-between text-sm mt-1 pt-1 border-t">
              <span className="text-muted-foreground">Total Paid:</span>
              <span className="font-semibold text-green-600">
                NPR {history.filter(h => h.type === 'payment').reduce((sum, h) => sum + h.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
