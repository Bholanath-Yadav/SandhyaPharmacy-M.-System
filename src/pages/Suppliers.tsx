import { useState, useEffect, useMemo } from 'react';
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
  Edit,
  Trash2,
  Truck,
  Phone,
  Mail,
  Building,
  Eye,
  Wallet,
  Calendar,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Filter,
  X,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type Supplier = Tables<'suppliers'>;
type Purchase = Tables<'purchases'>;
type Payment = Tables<'payments'>;
type PaymentMethod = typeof Constants.public.Enums.payment_method[number];

const PAYMENT_METHODS = Constants.public.Enums.payment_method;

type BalanceFilter = 'all' | 'with_due' | 'cleared';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    pan_number: '',
    notes: '',
  });

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);

  // Details dialog
  const [detailsSupplier, setDetailsSupplier] = useState<Supplier | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailPurchases, setDetailPurchases] = useState<Purchase[]>([]);
  const [detailPayments, setDetailPayments] = useState<Payment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pay due dialog
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supplierData = {
        name: formData.name,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        pan_number: formData.pan_number || null,
        notes: formData.notes || null,
      };

      if (selectedSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', selectedSupplier.id);
        if (error) throw error;
        toast.success('Supplier updated successfully');
      } else {
        const { error } = await supabase.from('suppliers').insert(supplierData);
        if (error) throw error;
        toast.success('Supplier added successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      const msg = error instanceof Error ? error.message : 'Failed to save supplier';
      toast.error(msg);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', supplier.id);
      if (error) throw error;
      toast.success(`Supplier ${supplier.name} deleted`);
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      const msg = error instanceof Error ? error.message : 'Failed to delete supplier';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      pan_number: '',
      notes: '',
    });
    setSelectedSupplier(null);
  };

  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      pan_number: supplier.pan_number || '',
      notes: supplier.notes || '',
    });
    setIsDialogOpen(true);
  };

  const openDetails = async (supplier: Supplier) => {
    setDetailsSupplier(supplier);
    setDetailsOpen(true);
    setDetailLoading(true);
    setDetailPurchases([]);
    setDetailPayments([]);

    const [purRes, payRes] = await Promise.all([
      supabase
        .from('purchases')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*')
        .eq('reference_id', supplier.id)
        .eq('payment_type', 'supplier')
        .order('created_at', { ascending: false }),
    ]);

    if (!purRes.error) setDetailPurchases(purRes.data || []);
    if (!payRes.error) setDetailPayments(payRes.data || []);
    setDetailLoading(false);
  };

  const openPayDialog = (supplier: Supplier) => {
    setPaySupplier(supplier);
    setPayAmount((supplier.current_balance || 0).toString());
    setPayMethod('cash');
    setPayRef('');
    setPayNotes('');
  };

  const handlePayDue = async () => {
    if (!paySupplier) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    const balance = paySupplier.current_balance || 0;
    if (amount > balance) {
      toast.error(`Cannot pay more than the outstanding balance of NPR ${balance.toFixed(2)}`);
      return;
    }

    setPaySubmitting(true);
    try {
      // 1. Insert payment record
      const { error: payError } = await supabase.from('payments').insert({
        payment_type: 'supplier',
        reference_id: paySupplier.id,
        amount,
        payment_method: payMethod,
        reference_number: payRef || null,
        notes: payNotes || `Payment to ${paySupplier.name}`,
      });
      if (payError) throw payError;

      // 2. Reduce supplier balance
      const newBalance = Math.max(0, balance - amount);
      const { error: balErr } = await supabase
        .from('suppliers')
        .update({ current_balance: newBalance })
        .eq('id', paySupplier.id);
      if (balErr) throw balErr;

      // 3. Allocate to oldest unpaid purchases (FIFO)
      const { data: openPurchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('supplier_id', paySupplier.id)
        .gt('due_amount', 0)
        .order('created_at', { ascending: true });

      let remaining = amount;
      for (const p of openPurchases || []) {
        if (remaining <= 0) break;
        const due = p.due_amount || 0;
        const apply = Math.min(remaining, due);
        await supabase
          .from('purchases')
          .update({
            paid_amount: (p.paid_amount || 0) + apply,
            due_amount: due - apply,
          })
          .eq('id', p.id);
        remaining -= apply;
      }

      // 4. Add to ledger
      await supabase.from('ledger').insert({
        transaction_type: 'payment',
        description: `Payment to supplier: ${paySupplier.name}`,
        debit: amount,
        credit: 0,
        balance: amount,
        reference_id: paySupplier.id,
      });

      toast.success(`Paid NPR ${amount.toFixed(2)} to ${paySupplier.name}`);
      setPaySupplier(null);
      fetchSuppliers();
    } catch (error) {
      console.error('Pay due error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to record payment';
      toast.error(msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (term) {
        const matches =
          s.name.toLowerCase().includes(term) ||
          s.contact_person?.toLowerCase().includes(term) ||
          s.phone?.includes(term) ||
          s.email?.toLowerCase().includes(term);
        if (!matches) return false;
      }
      const bal = s.current_balance || 0;
      if (balanceFilter === 'with_due' && bal <= 0) return false;
      if (balanceFilter === 'cleared' && bal > 0) return false;
      return true;
    });
  }, [suppliers, searchTerm, balanceFilter]);

  const hasActiveFilters = searchTerm || balanceFilter !== 'all';

  const totalPayable = suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0);
  const supplierTotals = useMemo(() => {
    const totalPurchases = detailPurchases.reduce((s, p) => s + p.total_amount, 0);
    const totalPaidViaPurchase = detailPurchases.reduce((s, p) => s + (p.paid_amount || 0), 0);
    const totalPaidViaPayments = detailPayments.reduce((s, p) => s + p.amount, 0);
    const totalPaid = totalPaidViaPurchase + totalPaidViaPayments;
    return { totalPurchases, totalPaid };
  }, [detailPurchases, detailPayments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage your medicine suppliers</p>
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
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{selectedSupplier ? 'Update' : 'Add'} Supplier</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-xl sm:text-2xl font-bold">{suppliers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Building className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Payable</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600">
                  NPR {totalPayable.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/10">
                <Wallet className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Suppliers with Due</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {suppliers.filter((s) => (s.current_balance || 0) > 0).length}
                </p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setBalanceFilter('all');
                }}
                className="ml-auto h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, contact, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={balanceFilter} onValueChange={(v) => setBalanceFilter(v as BalanceFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                <SelectItem value="with_due">With Outstanding Due</SelectItem>
                <SelectItem value="cleared">Cleared (No Due)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>All Suppliers</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredSuppliers.length} of {suppliers.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No suppliers found</p>
              {!hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  Add your first supplier
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredSuppliers.map((supplier) => {
                  const balance = supplier.current_balance || 0;
                  return (
                    <div key={supplier.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{supplier.name}</p>
                          {supplier.contact_person && (
                            <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
                          )}
                        </div>
                        {balance > 0 ? (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Due NPR {balance.toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Cleared
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {supplier.phone && (
                          <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </a>
                        )}
                        {supplier.email && (
                          <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-primary">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{supplier.email}</span>
                          </a>
                        )}
                      </div>

                      {supplier.pan_number && (
                        <p className="text-sm text-muted-foreground">PAN: {supplier.pan_number}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t gap-1 flex-wrap">
                        {balance > 0 && (
                          <Button
                            size="sm"
                            className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => openPayDialog(supplier)}
                          >
                            <Wallet className="h-3 w-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetails(supplier)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(supplier)}
                            className="h-8 px-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmDelete(supplier)}
                            className="h-8 px-2 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>PAN</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => {
                      const balance = supplier.current_balance || 0;
                      return (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <p className="font-medium">{supplier.name}</p>
                            {supplier.address && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {supplier.address}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {supplier.contact_person && (
                                <p className="text-sm font-medium">{supplier.contact_person}</p>
                              )}
                              {supplier.phone && (
                                <a
                                  href={`tel:${supplier.phone}`}
                                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                                >
                                  <Phone className="h-3 w-3" />
                                  {supplier.phone}
                                </a>
                              )}
                              {supplier.email && (
                                <a
                                  href={`mailto:${supplier.email}`}
                                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                                >
                                  <Mail className="h-3 w-3" />
                                  {supplier.email}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{supplier.pan_number || '-'}</TableCell>
                          <TableCell className="text-right">
                            {balance > 0 ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                NPR {balance.toLocaleString()}
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Cleared
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {balance > 0 && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => openPayDialog(supplier)}
                                >
                                  <Wallet className="h-3 w-3 mr-1" />
                                  Pay
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetails(supplier)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(supplier)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDelete(supplier)}
                                className="text-destructive hover:text-destructive"
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

      {/* Pay Due Dialog */}
      <Dialog open={!!paySupplier} onOpenChange={(o) => !o && setPaySupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay {paySupplier?.name}</DialogTitle>
          </DialogHeader>
          {paySupplier && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding Balance</span>
                  <span className="font-bold text-amber-600">
                    NPR {(paySupplier.current_balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={payMethod} onValueChange={(v: PaymentMethod) => setPayMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m} className="capitalize">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Cheque/Transaction #"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} rows={2} />
              </div>
              <p className="text-xs text-muted-foreground">
                The payment will be auto-allocated to the oldest unpaid purchases first.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaySupplier(null)} disabled={paySubmitting}>
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handlePayDue}
                  disabled={paySubmitting}
                >
                  {paySubmitting ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>{detailsSupplier?.name}</span>
              {detailsSupplier &&
                ((detailsSupplier.current_balance || 0) > 0 ? (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Due NPR {(detailsSupplier.current_balance || 0).toFixed(2)}
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Cleared
                  </Badge>
                ))}
            </DialogTitle>
          </DialogHeader>
          {detailsSupplier && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {detailsSupplier.contact_person && (
                  <div>
                    <p className="text-muted-foreground">Contact Person</p>
                    <p className="font-medium">{detailsSupplier.contact_person}</p>
                  </div>
                )}
                {detailsSupplier.phone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <a href={`tel:${detailsSupplier.phone}`} className="font-medium hover:text-primary">
                      {detailsSupplier.phone}
                    </a>
                  </div>
                )}
                {detailsSupplier.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <a href={`mailto:${detailsSupplier.email}`} className="font-medium hover:text-primary">
                      {detailsSupplier.email}
                    </a>
                  </div>
                )}
                {detailsSupplier.pan_number && (
                  <div>
                    <p className="text-muted-foreground">PAN</p>
                    <p className="font-medium">{detailsSupplier.pan_number}</p>
                  </div>
                )}
                {detailsSupplier.address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{detailsSupplier.address}</p>
                  </div>
                )}
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
                    <Receipt className="h-3 w-3" />
                    Purchases
                  </div>
                  <p className="font-bold">{detailPurchases.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
                    <TrendingUp className="h-3 w-3" />
                    Total Value
                  </div>
                  <p className="font-bold text-sm">NPR {supplierTotals.totalPurchases.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
                    <Wallet className="h-3 w-3" />
                    Total Paid
                  </div>
                  <p className="font-bold text-sm text-green-600">
                    NPR {supplierTotals.totalPaid.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Purchase History
                </h4>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : detailPurchases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No purchases yet from this supplier.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purchase #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Due</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailPurchases.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.purchase_number}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(p.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">NPR {p.total_amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  (p.due_amount || 0) > 0
                                    ? 'text-amber-600 font-medium'
                                    : 'text-muted-foreground'
                                }
                              >
                                NPR {(p.due_amount || 0).toFixed(2)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Payment History
                </h4>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : detailPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detailPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex gap-3 p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30"
                      >
                        <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                          <ArrowUpCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm">Payment to supplier</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(p.created_at), 'MMM dd, yyyy h:mm a')}
                              </p>
                              {p.reference_number && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Ref: {p.reference_number}
                                </p>
                              )}
                              {p.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">{p.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-green-600">
                                NPR {p.amount.toFixed(2)}
                              </p>
                              {p.payment_method && (
                                <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                                  {p.payment_method}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detailsSupplier.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p className="text-sm">{detailsSupplier.notes}</p>
                </div>
              )}

              {(detailsSupplier.current_balance || 0) > 0 && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setDetailsOpen(false);
                    openPayDialog(detailsSupplier);
                  }}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Pay Outstanding Due
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
              {(confirmDelete?.current_balance || 0) > 0 && (
                <>
                  <br />
                  <br />
                  <strong className="text-amber-600">
                    Warning: this supplier still has an outstanding balance of NPR{' '}
                    {(confirmDelete?.current_balance || 0).toFixed(2)}.
                  </strong>{' '}
                  Consider settling it first.
                </>
              )}
              <br />
              <br />
              Suppliers linked to existing purchases may not be deletable due to database constraints.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) handleDelete(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
