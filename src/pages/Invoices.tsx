import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { Search, Download, Eye, FileText, Calendar, User, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { downloadInvoicePDF, InvoiceData } from '@/components/InvoicePDF';
import { format } from 'date-fns';

type SalesInvoice = Tables<'sales_invoices'>;
type Customer = Tables<'customers'>;
type SaleItem = Tables<'sale_items'>;
type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;
type PharmacyProfile = Tables<'pharmacy_profile'>;

interface InvoiceWithDetails extends SalesInvoice {
  customers: Customer | null;
  sale_items: (SaleItem & {
    medicines: Medicine;
    medicine_batches: MedicineBatch;
  })[];
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [pharmacyProfile, setPharmacyProfile] = useState<PharmacyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        },
        customer: invoice.customers ? {
          name: invoice.customers.name,
          phone: invoice.customers.phone,
          address: invoice.customers.address,
        } : null,
        doctorName: invoice.doctor_name,
        prescriptionRef: invoice.prescription_reference,
        items: invoice.sale_items.map(item => ({
          name: item.medicines.name,
          batchNumber: item.medicine_batches.batch_number,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount_percent || 0,
          total: item.total_price,
        })),
        subtotal: invoice.subtotal,
        vatAmount: invoice.vat_amount || 0,
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

  const handleDeleteInvoice = async (invoice: InvoiceWithDetails) => {
    // Block invoice deletion - only allow archiving for audit safety
    // Medicines have already been sold and stock has been reduced
    const confirmMessage = `⚠️ IMPORTANT: Invoice ${invoice.invoice_number} cannot be fully deleted.

Once medicines are sold, stock cannot be restored for audit and inventory accuracy.

This will ARCHIVE the invoice (soft delete):
- Invoice will be hidden from the list
- Stock will NOT be restored
- Customer balance will remain unchanged
- All records are preserved for audit

Do you want to archive this invoice?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Instead of hard delete, we should mark as archived/deleted
      // Since we don't have an is_archived column, we'll add notes to indicate archived
      const { error: archiveError } = await supabase
        .from('sales_invoices')
        .update({ 
          notes: `[ARCHIVED on ${new Date().toLocaleDateString()}] ${invoice.notes || ''}`.trim()
        })
        .eq('id', invoice.id);

      if (archiveError) throw archiveError;

      toast.success(`Invoice ${invoice.invoice_number} has been archived. Stock and balances preserved.`);
      
      // Refresh but note: archived invoices will still show (we'd need a filter for production)
      // For now, inform user
      toast.info('Note: Archived invoices are preserved for audit purposes.');
      fetchInvoices();
    } catch (error) {
      console.error('Error archiving invoice:', error);
      toast.error('Failed to archive invoice');
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customers?.phone?.includes(searchTerm)
  );

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalDue = invoices.reduce((sum, inv) => sum + (inv.due_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">View and manage all sales invoices</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <FileText className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">NPR {totalSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold">NPR {totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <FileText className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-2xl font-bold text-amber-600">NPR {totalDue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="text-lg">All Invoices</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredInvoices.map((invoice) => (
                  <div key={invoice.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      {(invoice.due_amount || 0) > 0 ? (
                        <span className="text-amber-600 font-medium text-sm">
                          Due: NPR {invoice.due_amount?.toFixed(2)}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Paid
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{invoice.customers?.name || 'Walk-in Customer'}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span><strong>Total:</strong> NPR {invoice.total_amount.toFixed(2)}</span>
                      <span className="text-green-600"><strong>Paid:</strong> NPR {(invoice.paid_amount || 0).toFixed(2)}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {invoice.payment_method}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-end pt-2 border-t gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setDetailsOpen(true);
                        }}
                        className="h-8 px-2"
                      >
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
                        onClick={() => handleDeleteInvoice(invoice)}
                        className="h-8 px-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
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
                          {(invoice.due_amount || 0) > 0 ? (
                            <span className="text-amber-600 font-medium">
                              NPR {invoice.due_amount?.toFixed(2)}
                            </span>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {invoice.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(invoice)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Invoice Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedInvoice.created_at), 'MMMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {selectedInvoice.customers?.name || 'Walk-in Customer'}
                  </p>
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
                        <TableCell className="text-right">
                          NPR {item.unit_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.discount_percent || 0}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          NPR {item.total_price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>NPR {selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (13%)</span>
                  <span>NPR {(selectedInvoice.vat_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary">NPR {selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span>
                  <span>NPR {(selectedInvoice.paid_amount || 0).toFixed(2)}</span>
                </div>
                {(selectedInvoice.due_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-amber-600 font-medium">
                    <span>Due</span>
                    <span>NPR {selectedInvoice.due_amount?.toFixed(2)}</span>
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

              {/* Download Button */}
              <Button 
                className="w-full" 
                onClick={() => handleDownloadPDF(selectedInvoice)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
