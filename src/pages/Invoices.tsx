import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search,
  Download,
  Eye,
  FileText,
  Calendar,
  User,
  Trash2,
  Filter,
  X,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { downloadInvoicePDF, InvoiceData } from '@/components/InvoicePDF';
import { format } from 'date-fns';

type SalesInvoice = Tables<'sales_invoices'>;
type Customer = Tables<'customers'>;
type SaleItem = Tables<'sale_items'>;
type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;
type PharmacyProfile = Tables<'pharmacy_profile'>;
type Payment = Tables<'payments'>;

interface InvoiceWithDetails extends SalesInvoice {
  customers: Customer | null;
  sale_items: (SaleItem & {
    medicines: Medicine;
    medicine_batches: MedicineBatch;
  })[];
}

type StatusFilter = 'all' | 'paid' | 'partial' | 'due';

const getStatus = (invoice: InvoiceWithDetails): { label: string; color: string; key: StatusFilter } => {
  const due = invoice.due_amount || 0;
  const paid = invoice.paid_amount || 0;
  if (due <= 0 && paid >= invoice.total_amount) {
    return { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', key: 'paid' };
  }
  if (paid > 0 && due > 0) {
    return { label: 'Partial', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', key: 'partial' };
  }
  return { label: 'Due', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', key: 'due' };
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [pharmacyProfile, setPharmacyProfile] = useState<PharmacyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<InvoiceWithDetails | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchPharmacyProfile();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales_invoices')
      .select(`
        *,
        customers(*),
        sale_items(
          *,
          medicines(*),
          medicine_batches(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } else {
      setInvoices(data as unknown as InvoiceWithDetails[]);
    }
    setLoading(false);
  };

  const fetchPharmacyProfile = async () => {
    const { data } = await supabase.from('pharmacy_profile').select('*').limit(1).maybeSingle();
    if (data) setPharmacyProfile(data);
  };

  const fetchInvoicePayments = async (invoice: InvoiceWithDetails) => {
    if (!invoice.customers?.id) {
      setInvoicePayments([]);
      return;
    }
    setPaymentsLoading(true);
    // Show all due payments made by this customer after this invoice's date
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('reference_id', invoice.customers.id)
      .eq('payment_type', 'due_payment')
      .gte('created_at', invoice.created_at)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading payments:', error);
      setInvoicePayments([]);
    } else {
      setInvoicePayments((data || []) as Payment[]);
    }
    setPaymentsLoading(false);
  };

  const openDetails = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setDetailsOpen(true);
    fetchInvoicePayments(invoice);
  };

  const handleDownloadPDF = async (invoice: InvoiceWithDetails) => {
    try {
      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.invoice_number,
        date: format(new Date(invoice.created_at), 'MMMM dd, yyyy'),
        pharmacy: {
          name: pharmacyProfile?.name || 'Pharmacy',
          address: pharmacyProfile?.address,
          phone: pharmacyProfile?.phone,
          email: pharmacyProfile?.email,
          vatNumber: pharmacyProfile?.vat_number,
          panNumber: pharmacyProfile?.pan_number,
          logoUrl: pharmacyProfile?.logo_url,
        },
        customer: invoice.customers
          ? {
              name: invoice.customers.name,
              phone: invoice.customers.phone,
              address: invoice.customers.address,
            }
          : null,
        doctorName: invoice.doctor_name,
        prescriptionRef: invoice.prescription_reference,
        items: invoice.sale_items.map((item) => ({
          name: item.medicines.name,
          batchNumber: item.medicine_batches.batch_number,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount_percent || 0,
          total: item.total_price,
        })),
        subtotal: invoice.subtotal,
        vatAmount: invoice.vat_amount || 0,
        vatRatePercent:
          invoice.subtotal > 0
            ? Math.round(((invoice.vat_amount || 0) / invoice.subtotal) * 100)
            : undefined,
        total: invoice.total_amount,
        paidAmount: invoice.paid_amount || 0,
        dueAmount: invoice.due_amount || 0,
        paymentMethod: invoice.payment_method || 'cash',
        notes: invoice.notes,
      };

      await downloadInvoicePDF(invoiceData);
      toast.success('Invoice PDF downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleArchiveInvoice = async (invoice: InvoiceWithDetails) => {
    try {
      const { error: archiveError } = await supabase
        .from('sales_invoices')
        .update({
          notes: `[ARCHIVED on ${new Date().toLocaleDateString()}] ${invoice.notes || ''}`.trim(),
        })
        .eq('id', invoice.id);

      if (archiveError) throw archiveError;

      toast.success(`Invoice ${invoice.invoice_number} archived. Stock and balances preserved.`);
      fetchInvoices();
    } catch (error) {
      console.error('Error archiving invoice:', error);
      toast.error('Failed to archive invoice');
    }
  };

  const paymentMethods = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i) => i.payment_method && set.add(i.payment_method));
    return Array.from(set).sort();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return invoices.filter((inv) => {
      if (term) {
        const matchesText =
          inv.invoice_number.toLowerCase().includes(term) ||
          inv.customers?.name?.toLowerCase().includes(term) ||
          inv.customers?.phone?.includes(term);
        if (!matchesText) return false;
      }

      if (statusFilter !== 'all') {
        if (getStatus(inv).key !== statusFilter) return false;
      }

      if (methodFilter !== 'all' && inv.payment_method !== methodFilter) return false;

      const ts = new Date(inv.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;

      return true;
    });
  }, [invoices, searchTerm, statusFilter, methodFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    searchTerm || statusFilter !== 'all' || methodFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMethodFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalDue = filteredInvoices.reduce((sum, inv) => sum + (inv.due_amount || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

  // Build payment timeline for selected invoice
  const paymentTimeline = useMemo(() => {
    if (!selectedInvoice) return [];
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

    let runningDue = selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0);

    items.push({
      id: `inv-${selectedInvoice.id}`,
      date: selectedInvoice.created_at,
      label: 'Invoice issued',
      amount: selectedInvoice.paid_amount || 0,
      method: selectedInvoice.payment_method,
      runningDue,
      reference: selectedInvoice.invoice_number,
      type: 'invoice',
    });

    invoicePayments.forEach((p) => {
      runningDue = Math.max(0, runningDue - p.amount);
      items.push({
        id: p.id,
        date: p.created_at,
        label: 'Due payment received',
        amount: p.amount,
        method: p.payment_method,
        runningDue,
        reference: p.reference_number,
        type: 'payment',
      });
    });

    return items;
  }, [selectedInvoice, invoicePayments]);

  const totalCollectedForInvoice = useMemo(() => {
    if (!selectedInvoice) return 0;
    return (selectedInvoice.paid_amount || 0) + invoicePayments.reduce((s, p) => s + p.amount, 0);
  }, [selectedInvoice, invoicePayments]);

  const remainingForInvoice = useMemo(() => {
    if (!selectedInvoice) return 0;
    return Math.max(0, selectedInvoice.total_amount - totalCollectedForInvoice);
  }, [selectedInvoice, totalCollectedForInvoice]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">View and manage all sales invoices</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Invoices</p>
                <p className="text-xl sm:text-2xl font-bold">{filteredInvoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Sales</p>
                <p className="text-lg sm:text-2xl font-bold">NPR {totalSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Collected</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, customer, phone..."
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
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {paymentMethods.map((m) => (
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
            <span>All Invoices</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredInvoices.length} of {invoices.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              {hasActiveFilters && <p className="text-sm">Try adjusting your filters</p>}
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredInvoices.map((invoice) => {
                  const status = getStatus(invoice);
                  return (
                    <div key={invoice.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(invoice.created_at), 'MMM dd, yyyy h:mm a')}
                          </div>
                        </div>
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{invoice.customers?.name || 'Walk-in Customer'}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm pt-2 border-t">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">NPR {invoice.total_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className="font-medium text-green-600">
                            NPR {(invoice.paid_amount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Due</p>
                          <p
                            className={`font-medium ${
                              (invoice.due_amount || 0) > 0 ? 'text-amber-600' : 'text-green-600'
                            }`}
                          >
                            NPR {(invoice.due_amount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <Badge variant="outline" className="capitalize text-xs">
                          {invoice.payment_method}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => openDetails(invoice)} className="h-8 px-2">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice)}
                            className="h-8 px-2"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmDelete(invoice)}
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

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => {
                      const status = getStatus(invoice);
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                              </span>
                              <span className="text-xs text-muted-foreground ml-5">
                                {format(new Date(invoice.created_at), 'h:mm a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {invoice.customers?.name || 'Walk-in Customer'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            NPR {invoice.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            NPR {(invoice.paid_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                (invoice.due_amount || 0) > 0
                                  ? 'text-amber-600 font-medium'
                                  : 'text-muted-foreground'
                              }
                            >
                              NPR {(invoice.due_amount || 0).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={status.color}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {invoice.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openDetails(invoice)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(invoice)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDelete(invoice)}
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

      {/* Invoice Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>Invoice {selectedInvoice?.invoice_number}</span>
              {selectedInvoice && (
                <Badge variant="secondary" className={getStatus(selectedInvoice).color}>
                  {getStatus(selectedInvoice).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date &amp; Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedInvoice.created_at), 'MMMM dd, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {selectedInvoice.customers?.name || 'Walk-in Customer'}
                  </p>
                  {selectedInvoice.customers?.phone && (
                    <p className="text-xs text-muted-foreground">{selectedInvoice.customers.phone}</p>
                  )}
                </div>
                {selectedInvoice.doctor_name && (
                  <div>
                    <p className="text-muted-foreground">Doctor</p>
                    <p className="font-medium">{selectedInvoice.doctor_name}</p>
                  </div>
                )}
                {selectedInvoice.prescription_reference && (
                  <div>
                    <p className="text-muted-foreground">Prescription Ref</p>
                    <p className="font-medium">{selectedInvoice.prescription_reference}</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-center">Disc %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.sale_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">{item.medicines.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Batch: {item.medicine_batches.batch_number}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">NPR {item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{item.discount_percent || 0}%</TableCell>
                          <TableCell className="text-right font-medium">
                            NPR {item.total_price.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>NPR {selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT</span>
                  <span>NPR {(selectedInvoice.vat_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Invoice Total</span>
                  <span className="text-primary">NPR {selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Total Collected</span>
                  <span className="font-semibold">NPR {totalCollectedForInvoice.toFixed(2)}</span>
                </div>
                <div
                  className={`flex justify-between text-sm font-semibold ${
                    remainingForInvoice > 0 ? 'text-amber-600' : 'text-green-600'
                  }`}
                >
                  <span>Remaining Due Balance</span>
                  <span>NPR {remainingForInvoice.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Timeline */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Timeline
                </h4>
                {paymentsLoading ? (
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
                            <ArrowDownCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowUpCircle className="h-5 w-5 text-primary" />
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
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Ref: {entry.reference}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-semibold text-sm ${
                                  entry.type === 'payment' ? 'text-green-600' : ''
                                }`}
                              >
                                {entry.type === 'payment' ? '+ ' : ''}NPR {entry.amount.toFixed(2)}
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
                              NPR {entry.runningDue.toFixed(2)} {entry.runningDue > 0 ? 'due' : 'cleared'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {paymentTimeline.length === 1 && remainingForInvoice > 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No additional payments received yet for this customer since this invoice.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}

              <Button className="w-full" onClick={() => handleDownloadPDF(selectedInvoice)}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive invoice {confirmDelete?.invoice_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              For audit and inventory accuracy, invoices are archived rather than fully deleted.
              <br />
              <br />
              <strong>What happens:</strong> the invoice is marked archived in its notes. Stock is
              <strong> not </strong>restored and customer balance is preserved. All records remain
              available for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) handleArchiveInvoice(confirmDelete);
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
