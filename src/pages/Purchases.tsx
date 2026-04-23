import { useState, useEffect, useMemo } from 'react';
import { normalizeText } from '@/hooks/useBatchUpsert';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Trash2,
  Receipt,
  Package,
  Filter,
  X,
  Eye,
  Calendar,
  Truck,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type Purchase = Tables<'purchases'>;
type Supplier = Tables<'suppliers'>;
type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;
type PurchaseItemRow = Tables<'purchase_items'>;
type Payment = Tables<'payments'>;
type PaymentMethod = typeof Constants.public.Enums.payment_method[number];

interface PurchaseItem {
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  mrp: number;
}

interface PurchaseWithSupplier extends Purchase {
  supplier?: Supplier;
}

interface PurchaseItemDetail extends PurchaseItemRow {
  medicines: Medicine | null;
  medicine_batches: MedicineBatch | null;
}

type StatusFilter = 'all' | 'paid' | 'partial' | 'due';

const PAYMENT_METHODS = Constants.public.Enums.payment_method;
const VAT_RATE = 0.13;

const getStatus = (p: Purchase): { label: string; color: string; key: StatusFilter } => {
  const due = p.due_amount || 0;
  const paid = p.paid_amount || 0;
  if (due <= 0 && paid >= p.total_amount) {
    return { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', key: 'paid' };
  }
  if (paid > 0 && due > 0) {
    return { label: 'Partial', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', key: 'partial' };
  }
  return { label: 'Due', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: 'due' };
};

export default function Purchases() {
  const [purchases, setPurchases] = useState<PurchaseWithSupplier[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // View details
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithSupplier | null>(null);
  const [detailItems, setDetailItems] = useState<PurchaseItemDetail[]>([]);
  const [detailPayments, setDetailPayments] = useState<Payment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PurchaseWithSupplier | null>(null);

  // Purchase form state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [itemForm, setItemForm] = useState({
    medicine_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    mrp: '',
  });

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchMedicines();
    generatePurchaseNumber();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = (data || []).map((p) => ({
        ...p,
        supplier: (p as { suppliers?: Supplier }).suppliers,
      })) as PurchaseWithSupplier[];
      setPurchases(list);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    if (data) setSuppliers(data);
  };

  const fetchMedicines = async () => {
    const { data } = await supabase.from('medicines').select('*').eq('is_active', true).order('name');
    if (data) setMedicines(data);
  };

  const generatePurchaseNumber = () => {
    const prefix = 'PUR';
    const timestamp = Date.now().toString().slice(-6);
    setPurchaseNumber(`${prefix}-${timestamp}`);
  };

  const addItem = () => {
    if (
      !itemForm.medicine_id ||
      !itemForm.batch_number ||
      !itemForm.expiry_date ||
      !itemForm.quantity ||
      !itemForm.purchase_price ||
      !itemForm.selling_price
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    const medicine = medicines.find((m) => m.id === itemForm.medicine_id);
    if (!medicine) return;

    setItems([
      ...items,
      {
        medicine_id: itemForm.medicine_id,
        medicine_name: medicine.name,
        batch_number: itemForm.batch_number,
        expiry_date: itemForm.expiry_date,
        quantity: parseInt(itemForm.quantity),
        purchase_price: parseFloat(itemForm.purchase_price),
        selling_price: parseFloat(itemForm.selling_price),
        mrp: parseFloat(itemForm.mrp) || parseFloat(itemForm.selling_price),
      },
    ]);

    setItemForm({
      medicine_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: '',
      purchase_price: '',
      selling_price: '',
      mrp: '',
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.purchase_price * item.quantity, 0);
  const calculateVAT = () => calculateSubtotal() * VAT_RATE;
  const calculateTotal = () => calculateSubtotal() + calculateVAT();

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const subtotal = calculateSubtotal();
      const vatAmount = calculateVAT();
      const total = calculateTotal();
      const paid = parseFloat(paidAmount) || 0;
      const due = Math.max(0, total - paid);

      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          purchase_number: purchaseNumber,
          supplier_id: selectedSupplier || null,
          invoice_date: invoiceDate,
          subtotal,
          vat_amount: vatAmount,
          total_amount: total,
          paid_amount: paid,
          due_amount: due,
          payment_method: paymentMethod,
          notes: notes || null,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const batchResults: { batchId: string; item: PurchaseItem; wasUpdated: boolean }[] = [];
      for (const item of items) {
        const { data, error } = await supabase.rpc('upsert_medicine_batch', {
          p_medicine_id: item.medicine_id,
          p_batch_number: normalizeText(item.batch_number),
          p_expiry_date: item.expiry_date,
          p_quantity: item.quantity,
          p_purchase_price: item.purchase_price,
          p_selling_price: item.selling_price,
          p_mrp: item.mrp,
          p_min_stock_level: 10,
        });
        if (error) throw error;
        const result = data?.[0];
        if (result) batchResults.push({ batchId: result.id, item, wasUpdated: result.was_updated });
      }

      for (const { batchId, item } of batchResults) {
        await supabase.from('purchase_items').insert({
          purchase_id: purchase.id,
          medicine_id: item.medicine_id,
          batch_id: batchId,
          quantity: item.quantity,
          unit_price: item.purchase_price,
          total_price: item.purchase_price * item.quantity,
        });
      }

      const updatedCount = batchResults.filter((r) => r.wasUpdated).length;
      if (updatedCount > 0) toast.info(`${updatedCount} existing batch(es) had quantity updated`);

      if (selectedSupplier && due > 0) {
        const supplier = suppliers.find((s) => s.id === selectedSupplier);
        if (supplier) {
          await supabase
            .from('suppliers')
            .update({ current_balance: (supplier.current_balance || 0) + due })
            .eq('id', selectedSupplier);
        }
      }

      await supabase.from('ledger').insert({
        transaction_type: 'purchase',
        description: `Purchase: ${purchaseNumber}`,
        debit: 0,
        credit: total,
        balance: -total,
        reference_id: purchase.id,
      });

      toast.success('Purchase recorded successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchPurchases();
      fetchSuppliers();
    } catch (error: unknown) {
      console.error('Error creating purchase:', error);
      const message = error instanceof Error ? error.message : 'Failed to create purchase';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSupplier('');
    generatePurchaseNumber();
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setPaidAmount('');
    setNotes('');
    setItems([]);
    setItemForm({
      medicine_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: '',
      purchase_price: '',
      selling_price: '',
      mrp: '',
    });
  };

  const openDetails = async (purchase: PurchaseWithSupplier) => {
    setSelectedPurchase(purchase);
    setDetailsOpen(true);
    setDetailLoading(true);
    setDetailItems([]);
    setDetailPayments([]);

    const [itemsRes, paymentsRes] = await Promise.all([
      supabase
        .from('purchase_items')
        .select('*, medicines(*), medicine_batches(*)')
        .eq('purchase_id', purchase.id),
      purchase.supplier_id
        ? supabase
            .from('payments')
            .select('*')
            .eq('reference_id', purchase.supplier_id)
            .eq('payment_type', 'supplier')
            .gte('created_at', purchase.created_at)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as Payment[], error: null }),
    ]);

    if (!itemsRes.error) setDetailItems((itemsRes.data || []) as unknown as PurchaseItemDetail[]);
    if (!paymentsRes.error) setDetailPayments((paymentsRes.data || []) as Payment[]);
    setDetailLoading(false);
  };

  const handleArchivePurchase = async (purchase: PurchaseWithSupplier) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({
          notes: `[ARCHIVED on ${new Date().toLocaleDateString()}] ${purchase.notes || ''}`.trim(),
        })
        .eq('id', purchase.id);
      if (error) throw error;
      toast.success(`Purchase ${purchase.purchase_number} archived. Stock and balances preserved.`);
      fetchPurchases();
    } catch (error) {
      console.error('Error archiving purchase:', error);
      toast.error('Failed to archive purchase');
    }
  };

  const filteredPurchases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return purchases.filter((p) => {
      if (term) {
        const matches =
          p.purchase_number.toLowerCase().includes(term) ||
          p.supplier?.name?.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (statusFilter !== 'all' && getStatus(p).key !== statusFilter) return false;
      if (supplierFilter !== 'all' && p.supplier_id !== supplierFilter) return false;
      if (methodFilter !== 'all' && p.payment_method !== methodFilter) return false;

      const ts = new Date(p.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;

      return true;
    });
  }, [purchases, searchTerm, statusFilter, supplierFilter, methodFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== 'all' ||
    supplierFilter !== 'all' ||
    methodFilter !== 'all' ||
    dateFrom ||
    dateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setMethodFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const totalSpent = filteredPurchases.reduce((s, p) => s + p.total_amount, 0);
  const totalPaid = filteredPurchases.reduce((s, p) => s + (p.paid_amount || 0), 0);
  const totalDue = filteredPurchases.reduce((s, p) => s + (p.due_amount || 0), 0);

  // Payment timeline for selected purchase
  const paymentTimeline = useMemo(() => {
    if (!selectedPurchase) return [];
    const items: Array<{
      id: string;
      date: string;
      label: string;
      amount: number;
      method: string | null;
      runningDue: number;
      reference?: string | null;
      type: 'invoice' | 'payment';
    }> = [];

    let runningDue = selectedPurchase.total_amount - (selectedPurchase.paid_amount || 0);
    items.push({
      id: `pur-${selectedPurchase.id}`,
      date: selectedPurchase.created_at,
      label: 'Purchase recorded',
      amount: selectedPurchase.paid_amount || 0,
      method: selectedPurchase.payment_method,
      runningDue,
      reference: selectedPurchase.purchase_number,
      type: 'invoice',
    });

    detailPayments.forEach((p) => {
      runningDue = Math.max(0, runningDue - p.amount);
      items.push({
        id: p.id,
        date: p.created_at,
        label: 'Payment to supplier',
        amount: p.amount,
        method: p.payment_method,
        runningDue,
        reference: p.reference_number,
        type: 'payment',
      });
    });
    return items;
  }, [selectedPurchase, detailPayments]);

  const totalPaidForPurchase = useMemo(() => {
    if (!selectedPurchase) return 0;
    return (selectedPurchase.paid_amount || 0) + detailPayments.reduce((s, p) => s + p.amount, 0);
  }, [selectedPurchase, detailPayments]);

  const remainingForPurchase = useMemo(() => {
    if (!selectedPurchase) return 0;
    return Math.max(0, selectedPurchase.total_amount - totalPaidForPurchase);
  }, [selectedPurchase, totalPaidForPurchase]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-muted-foreground mt-1">Record medicine purchases from suppliers</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Purchase</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Purchase Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Purchase #</Label>
                  <Input value={purchaseNumber} onChange={(e) => setPurchaseNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Supplier</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Add Items */}
              <div className="space-y-4">
                <h3 className="font-semibold">Add Items</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Select
                      value={itemForm.medicine_id}
                      onValueChange={(v) => setItemForm({ ...itemForm, medicine_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Batch #"
                    value={itemForm.batch_number}
                    onChange={(e) => setItemForm({ ...itemForm, batch_number: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Expiry"
                    value={itemForm.expiry_date}
                    onChange={(e) => setItemForm({ ...itemForm, expiry_date: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Purchase Price"
                    value={itemForm.purchase_price}
                    onChange={(e) => setItemForm({ ...itemForm, purchase_price: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Selling Price"
                    value={itemForm.selling_price}
                    onChange={(e) => setItemForm({ ...itemForm, selling_price: e.target.value })}
                  />
                  <Button type="button" onClick={addItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.medicine_name}</TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell>{item.expiry_date}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.purchase_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {(item.quantity * item.purchase_price).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Paid</Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={calculateTotal().toFixed(2)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                  </div>
                </div>
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>NPR {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (13%)</span>
                    <span>NPR {calculateVAT().toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>NPR {calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-pharmacy-warning">
                    <span>Due</span>
                    <span>
                      NPR {Math.max(0, calculateTotal() - (parseFloat(paidAmount) || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Purchase'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Purchases</p>
                <p className="text-xl sm:text-2xl font-bold">{filteredPurchases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Spent</p>
                <p className="text-lg sm:text-2xl font-bold">NPR {totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Paid</p>
                <p className="text-lg sm:text-2xl font-bold">NPR {totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Outstanding</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600">NPR {totalDue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by purchase # or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="due">Due</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs"
                title="From date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs"
                title="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>All Purchases</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredPurchases.length} of {purchases.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No purchases found</p>
              {hasActiveFilters && <p className="text-sm text-muted-foreground">Try adjusting your filters</p>}
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredPurchases.map((purchase) => {
                  const status = getStatus(purchase);
                  return (
                    <div key={purchase.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{purchase.purchase_number}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(purchase.created_at), 'MMM dd, yyyy h:mm a')}
                          </div>
                        </div>
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        <span>{purchase.supplier?.name || 'Unknown supplier'}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm pt-2 border-t">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">NPR {purchase.total_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className="font-medium text-green-600">
                            NPR {(purchase.paid_amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Due</p>
                          <p
                            className={`font-medium ${
                              (purchase.due_amount || 0) > 0 ? 'text-amber-600' : 'text-green-600'
                            }`}
                          >
                            NPR {(purchase.due_amount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <Badge variant="outline" className="capitalize text-xs">
                          {purchase.payment_method}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => openDetails(purchase)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-destructive"
                            onClick={() => setConfirmDelete(purchase)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purchase #</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => {
                      const status = getStatus(purchase);
                      return (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(purchase.created_at), 'MMM dd, yyyy')}
                              </span>
                              <span className="text-xs text-muted-foreground ml-5">
                                {format(new Date(purchase.created_at), 'h:mm a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              {purchase.supplier?.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            NPR {purchase.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            NPR {(purchase.paid_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                (purchase.due_amount || 0) > 0
                                  ? 'text-amber-600 font-medium'
                                  : 'text-muted-foreground'
                              }
                            >
                              NPR {(purchase.due_amount || 0).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={status.color}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {purchase.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openDetails(purchase)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmDelete(purchase)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>Purchase {selectedPurchase?.purchase_number}</span>
              {selectedPurchase && (
                <Badge variant="secondary" className={getStatus(selectedPurchase).color}>
                  {getStatus(selectedPurchase).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Purchase Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedPurchase.created_at), 'MMMM dd, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">
                    {selectedPurchase.invoice_date
                      ? format(new Date(selectedPurchase.invoice_date), 'MMMM dd, yyyy')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedPurchase.supplier?.name || 'Unknown'}</p>
                  {selectedPurchase.supplier?.phone && (
                    <p className="text-xs text-muted-foreground">{selectedPurchase.supplier.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{selectedPurchase.payment_method}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items
                </h4>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Loading items...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Unit</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                              No item details available
                            </TableCell>
                          </TableRow>
                        ) : (
                          detailItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <p className="font-medium">{item.medicines?.name || 'Unknown'}</p>
                                {item.medicine_batches && (
                                  <p className="text-xs text-muted-foreground">
                                    Batch: {item.medicine_batches.batch_number} • Exp:{' '}
                                    {item.medicine_batches.expiry_date}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">NPR {item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">
                                NPR {item.total_price.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>NPR {selectedPurchase.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT</span>
                  <span>NPR {(selectedPurchase.vat_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Purchase Total</span>
                  <span className="text-primary">NPR {selectedPurchase.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Total Paid to Supplier</span>
                  <span className="font-semibold">NPR {totalPaidForPurchase.toFixed(2)}</span>
                </div>
                <div
                  className={`flex justify-between text-sm font-semibold ${
                    remainingForPurchase > 0 ? 'text-amber-600' : 'text-green-600'
                  }`}
                >
                  <span>Remaining Due</span>
                  <span>NPR {remainingForPurchase.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Timeline */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Timeline
                </h4>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Loading payment history...</p>
                ) : (
                  <div className="space-y-2">
                    {paymentTimeline.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex gap-3 p-3 rounded-lg border ${
                          entry.type === 'payment'
                            ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30'
                            : 'bg-card'
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            entry.type === 'payment'
                              ? 'bg-green-100 dark:bg-green-900/40'
                              : 'bg-primary/10'
                          }`}
                        >
                          {entry.type === 'payment' ? (
                            <ArrowUpCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm">{entry.label}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(entry.date), 'MMM dd, yyyy h:mm a')}
                              </p>
                              {entry.reference && entry.type === 'payment' && (
                                <p className="text-xs text-muted-foreground mt-0.5">Ref: {entry.reference}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-semibold text-sm ${
                                  entry.type === 'payment' ? 'text-green-600' : ''
                                }`}
                              >
                                {entry.type === 'payment' ? '- ' : ''}NPR {entry.amount.toFixed(2)}
                              </p>
                              {entry.method && (
                                <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                                  {entry.method}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-dashed flex justify-between text-xs">
                            <span className="text-muted-foreground">Balance after</span>
                            <span
                              className={`font-medium ${
                                entry.runningDue > 0 ? 'text-amber-600' : 'text-green-600'
                              }`}
                            >
                              NPR {entry.runningDue.toFixed(2)}{' '}
                              {entry.runningDue > 0 ? 'due' : 'cleared'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {paymentTimeline.length === 1 && remainingForPurchase > 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No additional payments to this supplier since this purchase. Pay from the Suppliers
                        page.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {selectedPurchase.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p className="text-sm">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive purchase {confirmDelete?.purchase_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              For audit and stock accuracy, purchases are archived rather than fully deleted.
              <br />
              <br />
              <strong>What happens:</strong> the purchase is marked archived in its notes. Stock that was
              added is <strong>not</strong> removed and the supplier balance is preserved. All records
              remain available for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) handleArchivePurchase(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
