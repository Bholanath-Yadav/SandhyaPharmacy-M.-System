import { useState, useEffect } from 'react';
import { upsertMedicineBatch, normalizeText } from '@/hooks/useBatchUpsert';
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
import { toast } from 'sonner';
import { Plus, Search, Trash2, Receipt, Package } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';

type Purchase = Tables<'purchases'>;
type Supplier = Tables<'suppliers'>;
type Medicine = Tables<'medicines'>;
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

const PAYMENT_METHODS = Constants.public.Enums.payment_method;
const VAT_RATE = 0.13;

export default function Purchases() {
  const [purchases, setPurchases] = useState<(Purchase & { supplier?: Supplier })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
      const purchasesWithSupplier = data?.map(p => ({
        ...p,
        supplier: p.suppliers as Supplier | undefined,
      })) || [];
      setPurchases(purchasesWithSupplier);
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
    if (!itemForm.medicine_id || !itemForm.batch_number || !itemForm.expiry_date || 
        !itemForm.quantity || !itemForm.purchase_price || !itemForm.selling_price) {
      toast.error('Please fill all required fields');
      return;
    }

    const medicine = medicines.find(m => m.id === itemForm.medicine_id);
    if (!medicine) return;

    setItems([...items, {
      medicine_id: itemForm.medicine_id,
      medicine_name: medicine.name,
      batch_number: itemForm.batch_number,
      expiry_date: itemForm.expiry_date,
      quantity: parseInt(itemForm.quantity),
      purchase_price: parseFloat(itemForm.purchase_price),
      selling_price: parseFloat(itemForm.selling_price),
      mrp: parseFloat(itemForm.mrp) || parseFloat(itemForm.selling_price),
    }]);

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

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * VAT_RATE;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

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

      // Create purchase
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

      // Create purchase items and batches using upsert (prevents duplicates)
      const batchResults: { batchId: string; item: typeof items[0]; wasUpdated: boolean }[] = [];
      
      for (const item of items) {
        // Use upsert function - if batch exists, quantity is increased
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
        if (result) {
          batchResults.push({ 
            batchId: result.id, 
            item,
            wasUpdated: result.was_updated
          });
        }
      }

      // Create purchase items
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

      // Show message about updated batches
      const updatedCount = batchResults.filter(r => r.wasUpdated).length;
      if (updatedCount > 0) {
        toast.info(`${updatedCount} existing batch(es) had quantity updated`);
      }

      // Update supplier balance
      if (selectedSupplier && due > 0) {
        const supplier = suppliers.find(s => s.id === selectedSupplier);
        if (supplier) {
          await supabase
            .from('suppliers')
            .update({ current_balance: (supplier.current_balance || 0) + due })
            .eq('id', selectedSupplier);
        }
      }

      // Add to ledger
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

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-muted-foreground mt-1">Record medicine purchases from suppliers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
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
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                    <Select value={itemForm.medicine_id} onValueChange={(v) => setItemForm({...itemForm, medicine_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input 
                    placeholder="Batch #" 
                    value={itemForm.batch_number}
                    onChange={(e) => setItemForm({...itemForm, batch_number: e.target.value})}
                  />
                  <Input 
                    type="date" 
                    placeholder="Expiry"
                    value={itemForm.expiry_date}
                    onChange={(e) => setItemForm({...itemForm, expiry_date: e.target.value})}
                  />
                  <Input 
                    type="number" 
                    placeholder="Qty"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})}
                  />
                  <Input 
                    type="number" 
                    placeholder="Purchase Price"
                    value={itemForm.purchase_price}
                    onChange={(e) => setItemForm({...itemForm, purchase_price: e.target.value})}
                  />
                  <Input 
                    type="number" 
                    placeholder="Selling Price"
                    value={itemForm.selling_price}
                    onChange={(e) => setItemForm({...itemForm, selling_price: e.target.value})}
                  />
                  <Button type="button" onClick={addItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Items List */}
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
                          <TableCell className="text-right">{(item.quantity * item.purchase_price).toFixed(2)}</TableCell>
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

              {/* Totals & Payment */}
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
                          <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
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
                    <span>NPR {Math.max(0, calculateTotal() - (parseFloat(paidAmount) || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Purchase'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by purchase number or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No purchases found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredPurchases.map((purchase) => (
                  <div key={purchase.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{purchase.purchase_number}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {purchase.invoice_date || 'No date'}
                        </p>
                      </div>
                      {(purchase.due_amount || 0) === 0 ? (
                        <Badge className="bg-pharmacy-success/10 text-pharmacy-success">Paid</Badge>
                      ) : (
                        <Badge className="bg-pharmacy-warning/10 text-pharmacy-warning">Partial</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm">
                      <span className="text-muted-foreground">Supplier: </span>
                      <span className="font-medium">{purchase.supplier?.name || 'Unknown'}</span>
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium">NPR {purchase.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paid</p>
                        <p className="font-medium text-green-600">NPR {(purchase.paid_amount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due</p>
                        <p className={`font-medium ${(purchase.due_amount || 0) > 0 ? 'text-pharmacy-warning' : ''}`}>
                          NPR {(purchase.due_amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purchase #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                        <TableCell>{purchase.invoice_date || '-'}</TableCell>
                        <TableCell>{purchase.supplier?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-right">NPR {purchase.total_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">NPR {(purchase.paid_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <span className={(purchase.due_amount || 0) > 0 ? 'text-pharmacy-warning font-medium' : ''}>
                            NPR {(purchase.due_amount || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(purchase.due_amount || 0) === 0 ? (
                            <Badge className="bg-pharmacy-success/10 text-pharmacy-success">Paid</Badge>
                          ) : (
                            <Badge className="bg-pharmacy-warning/10 text-pharmacy-warning">Partial</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
