import { useState, useEffect } from 'react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Users, Phone, Mail, CreditCard, MessageCircle, ExternalLink, Copy, History } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { PaymentHistoryDialog } from '@/components/PaymentHistoryDialog';

// WhatsApp reminder message generator with new professional template
const generateWhatsAppReminderMessage = (customerName: string, dueAmount: number, transactionDate?: string) => {
  const dateStr = transactionDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const message = `🏥 SANDHYA PHARMACY
Mahadeva-4, Baliya, Saptari

Dear Customer – ${customerName},

Warm greetings from Sandhya Pharmacy.
We hope you and your family are in good health.

With due respect, we would like to gently remind you about the pending balance from your recent purchase dated ${dateStr}.

💰 Pending Amount: NPR ${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

We kindly request you to please clear the above amount at your convenience.
Your cooperation and continued trust mean a lot to us.

Thank you for your understanding and support.

Warm regards,
Sandhya Pharmacy`;

  return encodeURIComponent(message);
};

// Format phone for WhatsApp (add country code if not present)
const formatPhoneForWhatsApp = (phone: string) => {
  // Remove any spaces, dashes, or special characters
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // If starts with 0, replace with Nepal country code
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '977' + cleanPhone.substring(1);
  }
  
  // If doesn't start with +, add it (assuming Nepal if no country code)
  if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('977')) {
    cleanPhone = '977' + cleanPhone;
  }
  
  // Remove + if present
  cleanPhone = cleanPhone.replace('+', '');
  
  return cleanPhone;
};

type Customer = Tables<'customers'>;

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappData, setWhatsappData] = useState<{ url: string; customerName: string; message: string } | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const customerData = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        notes: formData.notes || null,
      };

      if (selectedCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', selectedCustomer.id);
        if (error) throw error;
        toast.success('Customer updated successfully');
      } else {
        const { error } = await supabase.from('customers').insert(customerData);
        if (error) throw error;
        toast.success('Customer added successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast.error(error.message || 'Failed to save customer');
    }
  };

  const handleDelete = async (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    // Check if customer has due balance
    if ((customer.current_balance || 0) > 0) {
      toast.error(`Cannot delete customer "${customer.name}". They have an outstanding balance of NPR ${customer.current_balance?.toLocaleString()}.`);
      return;
    }

    // Check if customer has any sales history
    const { count: salesCount, error: salesCheckError } = await supabase
      .from('sales_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id);

    if (salesCheckError) {
      console.error('Error checking sales history:', salesCheckError);
      toast.error('Failed to verify customer history');
      return;
    }

    if (salesCount && salesCount > 0) {
      toast.error(`Cannot delete customer "${customer.name}". They have ${salesCount} invoice(s) in sales history. You can hide them from POS by setting their status to inactive.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error.message || 'Failed to delete customer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: '',
      notes: '',
    });
    setSelectedCustomer(null);
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      credit_limit: customer.credit_limit?.toString() || '',
      notes: customer.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSendWhatsAppReminder = async (customer: Customer) => {
    if (!customer.phone) {
      toast.error('No phone number available for this customer');
      return;
    }
    
    if ((customer.current_balance || 0) <= 0) {
      toast.error('This customer has no due amount');
      return;
    }

    // Get the last transaction date for this customer
    const { data: lastInvoice } = await supabase
      .from('sales_invoices')
      .select('created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const transactionDate = lastInvoice 
      ? new Date(lastInvoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : undefined;

    const formattedPhone = formatPhoneForWhatsApp(customer.phone);
    const rawMessage = `🏥 SANDHYA PHARMACY
Mahadeva-4, Baliya, Saptari

Dear Customer – ${customer.name},

Warm greetings from Sandhya Pharmacy.
We hope you and your family are in good health.

With due respect, we would like to gently remind you about the pending balance from your recent purchase dated ${transactionDate || 'recently'}.

💰 Pending Amount: NPR ${(customer.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

We kindly request you to please clear the above amount at your convenience.
Your cooperation and continued trust mean a lot to us.

Thank you for your understanding and support.

Warm regards,
Sandhya Pharmacy`;
    
    const message = encodeURIComponent(rawMessage);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    
    setWhatsappData({
      url: whatsappUrl,
      customerName: customer.name,
      message: rawMessage
    });
    setWhatsappDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard!');
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDues = customers.reduce((sum, c) => sum + (c.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your customer database</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
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
                <Label htmlFor="credit_limit">Credit Limit (NPR)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
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
                <Button type="submit">{selectedCustomer ? 'Update' : 'Add'} Customer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pharmacy-danger/10">
                <CreditCard className="h-6 w-6 text-pharmacy-danger" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Dues</p>
                <p className="text-2xl font-bold text-pharmacy-danger">NPR {totalDues.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pharmacy-warning/10">
                <Users className="h-6 w-6 text-pharmacy-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Dues</p>
                <p className="text-2xl font-bold">{customers.filter(c => (c.current_balance || 0) > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No customers found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                Add your first customer
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{customer.name}</p>
                        {customer.address && (
                          <p className="text-sm text-muted-foreground truncate">{customer.address}</p>
                        )}
                      </div>
                      {(customer.current_balance || 0) > 0 && (
                        <span className="text-pharmacy-danger font-medium text-sm flex-shrink-0">
                          NPR {(customer.current_balance || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{customer.email}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Credit Limit: </span>
                        <span className="font-medium">NPR {(customer.credit_limit || 0).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHistoryCustomer(customer);
                            setHistoryDialogOpen(true);
                          }}
                          className="h-8 px-2"
                          title="View History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {(customer.current_balance || 0) > 0 && customer.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendWhatsAppReminder(customer)}
                            className="h-8 px-2 text-green-600"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(customer)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
                          className="h-8 px-2 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Credit Limit</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <p className="font-medium">{customer.name}</p>
                          {customer.address && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {customer.address}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          NPR {(customer.credit_limit || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(customer.current_balance || 0) > 0 ? 'text-pharmacy-danger font-medium' : ''}>
                            NPR {(customer.current_balance || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setHistoryCustomer(customer);
                                setHistoryDialogOpen(true);
                              }}
                              title="View Payment History"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            {(customer.current_balance || 0) > 0 && customer.phone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendWhatsAppReminder(customer)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer.id)}
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

      {/* WhatsApp Reminder Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Send WhatsApp Reminder
            </DialogTitle>
            <DialogDescription>
              Send payment reminder to {whatsappData?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {whatsappData?.message}
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={whatsappData?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open in WhatsApp
              </a>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(whatsappData?.message || '')}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Message
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Click "Open in WhatsApp" to send the reminder. If it doesn't open, copy the message and send manually.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <PaymentHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        customer={historyCustomer}
      />
    </div>
  );
}
