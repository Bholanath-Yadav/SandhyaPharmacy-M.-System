import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Download } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';
import { downloadInvoicePDF, InvoiceData } from '@/components/InvoicePDF';
import { POSSkeleton } from '@/components/pos/POSSkeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAppSettings } from '@/hooks/useAppSettings';

type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;
type Customer = Tables<'customers'>;
type PaymentMethod = typeof Constants.public.Enums.payment_method[number];

interface CartItem {
  medicine: Medicine;
  batch: MedicineBatch;
  quantity: number;
  discount_percent: number;
}

const PAYMENT_METHODS = Constants.public.Enums.payment_method;

type PharmacyProfile = Tables<'pharmacy_profile'>;

// Memoized cart item component for better performance
const CartItemRow = memo(({ 
  item, 
  index, 
  onUpdateQuantity, 
  onSetQuantity,
  onUpdateDiscount, 
  onRemove 
}: {
  item: CartItem;
  index: number;
  onUpdateQuantity: (index: number, delta: number) => void;
  onSetQuantity: (index: number, quantity: number) => void;
  onUpdateDiscount: (index: number, discount: number) => void;
  onRemove: (index: number) => void;
}) => {
  const itemTotal = item.batch.selling_price * item.quantity;
  const discount = itemTotal * (item.discount_percent / 100);
  
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{item.medicine.name}</p>
        <p className="text-xs text-muted-foreground">
          Batch: {item.batch.batch_number}
          {item.medicine.rack_no && <span className="ml-1">• Rack: {item.medicine.rack_no}</span>}
        </p>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 touch-manipulation"
            onClick={() => onUpdateQuantity(index, -1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            min="1"
            max={item.batch.quantity}
            value={item.quantity === 0 ? '' : item.quantity}
            onChange={(e) => onSetQuantity(index, parseInt(e.target.value) || 0)}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (!val || val < 1) onSetQuantity(index, 1);
            }}
            className="w-12 h-7 text-center text-sm px-1"
          />
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 touch-manipulation"
            onClick={() => onUpdateQuantity(index, 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right text-sm hidden sm:table-cell">
        {item.batch.selling_price.toFixed(2)}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Input
          type="number"
          min="0"
          max="100"
          value={item.discount_percent}
          onChange={(e) => onUpdateDiscount(index, parseFloat(e.target.value) || 0)}
          className="w-14 h-8 text-center mx-auto text-sm"
        />
      </TableCell>
      <TableCell className="text-right font-medium text-sm">
        {(itemTotal - discount).toFixed(2)}
      </TableCell>
      <TableCell>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(index)}
          className="h-8 w-8 text-destructive hover:text-destructive touch-manipulation"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

CartItemRow.displayName = 'CartItemRow';

// Memoized medicine search result item
const MedicineSearchItem = memo(({ 
  medicine, 
  onAdd 
}: { 
  medicine: Medicine & { batches: MedicineBatch[] }; 
  onAdd: (medicine: Medicine & { batches: MedicineBatch[] }) => void;
}) => (
  <div
    className="p-3 hover:bg-muted/50 active:bg-muted cursor-pointer border-b last:border-b-0 flex items-center justify-between touch-manipulation"
    onClick={() => onAdd(medicine)}
  >
    <div className="min-w-0 flex-1">
      <p className="font-medium truncate">{medicine.name}</p>
      <p className="text-sm text-muted-foreground truncate">
        {medicine.generic_name} • Stock: {medicine.batches.reduce((s, b) => s + b.quantity, 0)}
        {medicine.rack_no && <span className="ml-1">• Rack: {medicine.rack_no}</span>}
      </p>
    </div>
    <div className="text-right ml-2 flex-shrink-0">
      <p className="font-bold text-sm">NPR {medicine.batches[0]?.selling_price.toFixed(2)}</p>
      <Button size="sm" variant="ghost" className="h-7 px-2">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
));

MedicineSearchItem.displayName = 'MedicineSearchItem';

export default function Sales() {
  const [medicines, setMedicines] = useState<(Medicine & { batches: MedicineBatch[] })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [isVatInclusive, setIsVatInclusive] = useState(true);
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pharmacyProfile, setPharmacyProfile] = useState<PharmacyProfile | null>(null);
  const { data: appSettings } = useAppSettings();
  const VAT_RATE = appSettings?.vatRate ?? 0.13;
  const [lastInvoice, setLastInvoice] = useState<InvoiceData | null>(null);
  const [isDuePaymentMode, setIsDuePaymentMode] = useState(false);
  const [defaultQty, setDefaultQty] = useState<number>(1);
  const searchRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Debounced search for instant feel with optimized filtering
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 100);
  const debouncedCustomerSearch = useDebouncedValue(customerSearchTerm, 100);

  // Parallel data fetching for faster initial load
  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        const [medicinesRes, customersRes, profileRes] = await Promise.all([
          supabase
            .from('medicines')
            .select('*, medicine_batches(*)')
            .eq('is_active', true)
            .order('name'),
          supabase.from('customers').select('*').order('name'),
          supabase.from('pharmacy_profile').select('*').limit(1).single()
        ]);

        if (medicinesRes.data) {
          const medicinesWithBatches = medicinesRes.data.map(m => ({
            ...m,
            batches: (m.medicine_batches || []).filter((b: MedicineBatch) => 
              b.quantity > 0 && new Date(b.expiry_date) > new Date()
            ),
          })).filter(m => m.batches.length > 0);
          setMedicines(medicinesWithBatches);
        }

        if (customersRes.data) setCustomers(customersRes.data);
        if (profileRes.data) setPharmacyProfile(profileRes.data);
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, []);

  // Memoized filtered medicines for instant search
  const filteredMedicines = useMemo(() => {
    if (!debouncedSearchTerm) return [];
    const term = debouncedSearchTerm.toLowerCase();
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.generic_name?.toLowerCase().includes(term) ||
        m.barcode?.includes(debouncedSearchTerm) ||
        m.rack_no?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [medicines, debouncedSearchTerm]);

  // Memoized filtered customers
  const filteredCustomers = useMemo(() => {
    if (!debouncedCustomerSearch) return [];
    const term = debouncedCustomerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.phone?.includes(debouncedCustomerSearch)
    ).slice(0, 8);
  }, [customers, debouncedCustomerSearch]);

  // Memoized calculations
  const { subtotal, vatAmount, total, totalPayable, remainingDue } = useMemo(() => {
    const itemsTotal = cart.reduce((sum, item) => {
      const itemTotal = item.batch.selling_price * item.quantity;
      const discount = itemTotal * (item.discount_percent / 100);
      return sum + (itemTotal - discount);
    }, 0);
    
    const sub = isVatInclusive ? itemsTotal / (1 + VAT_RATE) : itemsTotal;
    const vat = isVatInclusive ? itemsTotal - sub : sub * VAT_RATE;
    const tot = sub + vat;
    const previousDue = selectedCustomerData?.current_balance || 0;
    const payable = tot + previousDue;
    const paid = parseFloat(paidAmount) || 0;
    const due = Math.max(0, payable - paid);
    
    return { subtotal: sub, vatAmount: vat, total: tot, totalPayable: payable, remainingDue: due };
  }, [cart, isVatInclusive, selectedCustomerData, paidAmount, VAT_RATE]);

  // Optimized cart operations with useCallback
  // Optimized cart operations with useCallback
  // Same medicine + same batch → increase quantity; different batch → separate line
  const addToCart = useCallback((medicine: Medicine & { batches: MedicineBatch[] }, qty?: number) => {
    const sortedBatches = [...medicine.batches].sort(
      (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    );
    const batch = sortedBatches[0];
    if (!batch) return;

    const quantityToAdd = qty ?? defaultQty;

    setCart(prevCart => {
      // Check if same medicine + same batch already in cart
      const existingIndex = prevCart.findIndex(
        (item) => item.medicine.id === medicine.id && item.batch.id === batch.id
      );

      if (existingIndex >= 0) {
        // Same medicine + same batch → increase quantity
        const newQty = prevCart[existingIndex].quantity + quantityToAdd;
        if (newQty <= batch.quantity) {
          const newCart = [...prevCart];
          newCart[existingIndex] = { ...newCart[existingIndex], quantity: newQty };
          toast.info(`${medicine.name} quantity increased to ${newQty}`);
          return newCart;
        }
        toast.error('Not enough stock available');
        return prevCart;
      }
      // New item or different batch → add as new line
      if (quantityToAdd > batch.quantity) {
        toast.error(`Only ${batch.quantity} in stock`);
        return prevCart;
      }
      return [...prevCart, { medicine, batch, quantity: quantityToAdd, discount_percent: 0 }];
    });
    setSearchTerm('');
    setDefaultQty(1); // Reset to 1 after adding
    searchRef.current?.focus();
  }, [defaultQty]);

  const updateQuantity = useCallback((index: number, delta: number) => {
    setCart(prevCart => {
      const newCart = [...prevCart];
      const newQty = newCart[index].quantity + delta;
      if (newQty <= 0) {
        newCart.splice(index, 1);
      } else if (newQty <= newCart[index].batch.quantity) {
        newCart[index] = { ...newCart[index], quantity: newQty };
      } else {
        toast.error('Not enough stock');
        return prevCart;
      }
      return newCart;
    });
  }, []);

  const setQuantity = useCallback((index: number, quantity: number) => {
    setCart(prevCart => {
      const newCart = [...prevCart];
      const maxQty = newCart[index].batch.quantity;
      if (quantity === 0) {
        // Allow empty/zero temporarily while typing
        newCart[index] = { ...newCart[index], quantity: 0 };
        return newCart;
      }
      const validQty = Math.min(quantity, maxQty);
      if (quantity > maxQty) {
        toast.error(`Only ${maxQty} in stock`);
      }
      newCart[index] = { ...newCart[index], quantity: validQty };
      return newCart;
    });
  }, []);

  const updateDiscount = useCallback((index: number, discount: number) => {
    setCart(prevCart => {
      const newCart = [...prevCart];
      newCart[index] = { ...newCart[index], discount_percent: Math.min(100, Math.max(0, discount)) };
      return newCart;
    });
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
  }, []);

  const handleDuePayment = useCallback(async () => {
    if (!selectedCustomerData || (selectedCustomerData.current_balance || 0) <= 0) {
      toast.error('No customer with due balance selected');
      return;
    }

    const paymentAmount = parseFloat(paidAmount) || 0;
    if (paymentAmount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    setLoading(true);
    try {
      const currentDue = selectedCustomerData.current_balance || 0;
      const newBalance = Math.max(0, currentDue - paymentAmount);

      await Promise.all([
        supabase
          .from('customers')
          .update({ current_balance: newBalance })
          .eq('id', selectedCustomerData.id),
        supabase.from('payments').insert({
          reference_id: selectedCustomerData.id,
          payment_type: 'due_payment',
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: `Due payment from ${selectedCustomerData.name}`,
        }),
        supabase.from('ledger').insert({
          transaction_type: 'payment_received',
          description: `Due payment received from ${selectedCustomerData.name}`,
          debit: 0,
          credit: paymentAmount,
          balance: paymentAmount,
          reference_id: selectedCustomerData.id,
        })
      ]);

      const clearedMessage = newBalance === 0 
        ? `Due fully cleared for ${selectedCustomerData.name}!` 
        : `Payment of NPR ${paymentAmount.toFixed(2)} received. Remaining due: NPR ${newBalance.toFixed(2)}`;
      
      toast.success(clearedMessage);

      setSelectedCustomer('');
      setSelectedCustomerData(null);
      setCustomerSearchTerm('');
      setPaidAmount('');
      setIsDuePaymentMode(false);
      
      // Refresh customers in background
      supabase.from('customers').select('*').order('name').then(({ data }) => {
        if (data) setCustomers(data);
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process payment';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerData, paidAmount, paymentMethod]);

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

      const previousDue = selectedCustomerData?.current_balance || 0;
      const paid = parseFloat(paidAmount) || 0;
      const currentSaleDue = Math.max(0, total - Math.max(0, paid - previousDue));
      const newRemainingDue = Math.max(0, totalPayable - paid);

      let customerId = selectedCustomer || null;

      if (!selectedCustomer && customerSearchTerm.trim() && newRemainingDue > 0) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerSearchTerm.trim(),
            phone: customerPhone.trim() || null,
            current_balance: newRemainingDue,
          })
          .select()
          .single();

        if (customerError) {
          toast.error('Failed to create customer. Please try again.');
          setLoading(false);
          return;
        }

        customerId = newCustomer.id;
        toast.success(`New customer "${customerSearchTerm.trim()}" added with due amount NPR ${newRemainingDue.toFixed(2)}`);
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: customerId,
          subtotal,
          vat_amount: vatAmount,
          total_amount: total,
          paid_amount: Math.min(paid, totalPayable),
          due_amount: currentSaleDue,
          payment_method: paymentMethod,
          is_vat_inclusive: isVatInclusive,
          doctor_name: null,
          prescription_reference: null,
          notes: notes || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Batch insert sale items
      const saleItemsInserts = cart.map(item => {
        const itemTotal = item.batch.selling_price * item.quantity;
        const discount = itemTotal * (item.discount_percent / 100);
        return {
          invoice_id: invoice.id,
          medicine_id: item.medicine.id,
          batch_id: item.batch.id,
          quantity: item.quantity,
          unit_price: item.batch.selling_price,
          discount_percent: item.discount_percent,
          total_price: itemTotal - discount,
        };
      });

      await supabase.from('sale_items').insert(saleItemsInserts);

      // Batch update stock
      await Promise.all(
        cart.map(item =>
          supabase
            .from('medicine_batches')
            .update({ quantity: item.batch.quantity - item.quantity })
            .eq('id', item.batch.id)
        )
      );

      if (customerId || selectedCustomer) {
        const targetCustomerId = customerId || selectedCustomer;
        await supabase
          .from('customers')
          .update({ current_balance: newRemainingDue })
          .eq('id', targetCustomerId);
      }

      await supabase.from('ledger').insert({
        transaction_type: 'sale',
        description: `Sale Invoice: ${invoiceNumber}`,
        debit: total,
        credit: 0,
        balance: total,
        reference_id: invoice.id,
      });

      const customer = customerId ? customers.find(c => c.id === customerId) : null;
      const invoiceData: InvoiceData = {
        invoiceNumber,
        date: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        pharmacy: {
          name: pharmacyProfile?.name || 'Pharmacy',
          address: pharmacyProfile?.address,
          phone: pharmacyProfile?.phone,
          email: pharmacyProfile?.email,
          vatNumber: pharmacyProfile?.vat_number,
          panNumber: pharmacyProfile?.pan_number,
          logoUrl: pharmacyProfile?.logo_url,
        },
        vatRatePercent: appSettings?.vatRatePercent ?? 13,
        customer: customer ? {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        } : (customerSearchTerm.trim() ? {
          name: customerSearchTerm.trim(),
          phone: null,
          address: null,
        } : null),
        doctorName: null,
        prescriptionRef: null,
        items: cart.map(item => {
          const itemTotal = item.batch.selling_price * item.quantity;
          const discount = itemTotal * (item.discount_percent / 100);
          return {
            name: item.medicine.name,
            batchNumber: item.batch.batch_number,
            quantity: item.quantity,
            unitPrice: item.batch.selling_price,
            discount: item.discount_percent,
            total: itemTotal - discount,
          };
        }),
        subtotal,
        vatAmount,
        total,
        paidAmount: paid,
        dueAmount: currentSaleDue,
        paymentMethod,
        notes: notes || null,
      };

      setLastInvoice(invoiceData);
      toast.success(`Invoice ${invoiceNumber} created!`);
      
      // Reset form
      setCart([]);
      setSelectedCustomer('');
      setSelectedCustomerData(null);
      setCustomerSearchTerm('');
      setPaidAmount('');
      setCustomerPhone('');
      setNotes('');
      setIsDuePaymentMode(false);
      
      // Refresh data in background
      Promise.all([
        supabase
          .from('medicines')
          .select('*, medicine_batches(*)')
          .eq('is_active', true)
          .order('name'),
        supabase.from('customers').select('*').order('name')
      ]).then(([medicinesRes, customersRes]) => {
        if (medicinesRes.data) {
          const medicinesWithBatches = medicinesRes.data.map(m => ({
            ...m,
            batches: (m.medicine_batches || []).filter((b: MedicineBatch) => 
              b.quantity > 0 && new Date(b.expiry_date) > new Date()
            ),
          })).filter(m => m.batches.length > 0);
          setMedicines(medicinesWithBatches);
        }
        if (customersRes.data) setCustomers(customersRes.data);
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [cart, selectedCustomer, customerSearchTerm, selectedCustomerData, paidAmount, paymentMethod, isVatInclusive, customerPhone, notes, subtotal, vatAmount, total, totalPayable, pharmacyProfile, customers]);

  const handlePrintInvoice = useCallback(async () => {
    if (!lastInvoice) {
      toast.error('No invoice to print. Complete a sale first.');
      return;
    }
    try {
      await downloadInvoicePDF(lastInvoice);
      toast.success('Invoice PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  }, [lastInvoice]);

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer.id);
    setSelectedCustomerData(customer);
    setCustomerSearchTerm(customer.name + (customer.phone ? ` (${customer.phone})` : ''));
    setShowCustomerDropdown(false);
  }, []);

  const clearCustomer = useCallback(() => {
    setSelectedCustomer('');
    setSelectedCustomerData(null);
    setCustomerSearchTerm('');
    setIsDuePaymentMode(false);
  }, []);

  // Keyboard shortcuts for POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // F1 - Focus medicine search
      if (e.key === 'F1') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // F2 - Focus customer field
      if (e.key === 'F2') {
        e.preventDefault();
        customerInputRef.current?.focus();
        return;
      }

      // F12 - Checkout
      if (e.key === 'F12') {
        e.preventDefault();
        if (isDuePaymentMode) {
          handleDuePayment();
        } else if (cart.length > 0) {
          handleCheckout();
        }
        return;
      }

      // Escape - Clear search or close dropdowns
      if (e.key === 'Escape') {
        if (searchTerm) {
          setSearchTerm('');
          searchRef.current?.focus();
        } else if (showCustomerDropdown) {
          setShowCustomerDropdown(false);
        }
        return;
      }

      // Enter in search - Add first result to cart
      if (e.key === 'Enter' && isInput && target === searchRef.current) {
        e.preventDefault();
        if (filteredMedicines.length > 0) {
          addToCart(filteredMedicines[0]);
        }
        return;
      }

      // Only handle shortcuts below when not in an input
      if (isInput) return;

      // Delete or Backspace - Remove last cart item
      if ((e.key === 'Delete' || e.key === 'Backspace') && cart.length > 0) {
        e.preventDefault();
        removeFromCart(cart.length - 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, showCustomerDropdown, filteredMedicines, cart, isDuePaymentMode, addToCart, removeFromCart, handleCheckout, handleDuePayment]);

  // Show skeleton during initial load
  if (initialLoading) {
    return <POSSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Point of Sale</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Create new sales and invoices</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span className="font-medium">Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">F1</kbd> Search
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">F2</kbd> Customer
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">Enter</kbd> Add
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">F12</kbd> Checkout
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">Esc</kbd> Clear
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Product Search */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Medicine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={searchRef}
                    placeholder="Type medicine name or scan barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-lg h-12"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-10"
                    onClick={() => setDefaultQty(prev => Math.max(1, prev - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    ref={qtyInputRef}
                    type="number"
                    min="1"
                    value={defaultQty}
                    onChange={(e) => setDefaultQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 h-12 text-center text-lg font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-10"
                    onClick={() => setDefaultQty(prev => prev + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {searchTerm && (
                <div className="mt-4 max-h-64 overflow-y-auto border rounded-lg scroll-smooth scrollbar-thin">
                  {filteredMedicines.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No medicines found
                    </div>
                  ) : (
                    filteredMedicines.map((medicine) => (
                      <MedicineSearchItem 
                        key={medicine.id} 
                        medicine={medicine} 
                        onAdd={addToCart} 
                      />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Cart is empty. Search and add medicines.</p>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Disc %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item, index) => (
                        <CartItemRow
                          key={`${item.medicine.id}-${item.batch.id}`}
                          item={item}
                          index={index}
                          onUpdateQuantity={updateQuantity}
                          onSetQuantity={setQuantity}
                          onUpdateDiscount={updateDiscount}
                          onRemove={removeFromCart}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Checkout Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative">
                <Label>Customer (Optional)</Label>
                <Input
                  ref={customerInputRef}
                  placeholder="Search customer or leave empty for walk-in..."
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setShowCustomerDropdown(true);
                    if (e.target.value === '') {
                      clearCustomer();
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  autoComplete="off"
                />
                {showCustomerDropdown && customerSearchTerm && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto scrollbar-thin">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          className={`p-2 hover:bg-muted cursor-pointer border-b last:border-b-0 touch-manipulation ${(c.current_balance || 0) > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                          onClick={() => handleCustomerSelect(c)}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{c.name}</p>
                            {(c.current_balance || 0) > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full flex-shrink-0 ml-2">
                                Due
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                            {(c.current_balance || 0) > 0 && (
                              <p className="text-xs text-amber-600 font-medium">NPR {c.current_balance?.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-sm">
                        <p className="text-muted-foreground">No customer found.</p>
                        <p className="text-primary text-xs mt-1">
                          New customer "{customerSearchTerm}" will be created if there's due amount.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {selectedCustomer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-7 h-6 text-xs"
                    onClick={clearCustomer}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Previous Due Balance Alert */}
              {selectedCustomerData && (selectedCustomerData.current_balance || 0) > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Previous Due Balance</span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      NPR {(selectedCustomerData.current_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  {cart.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                      onClick={() => setIsDuePaymentMode(true)}
                    >
                      Pay Due Only (No New Sale)
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number (optional)"
                  autoComplete="off"
                  type="tel"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDuePaymentMode ? (
                <>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <div className="flex justify-between font-bold text-lg text-amber-700 dark:text-amber-300">
                      <span>Due Balance</span>
                      <span>NPR {(selectedCustomerData?.current_balance || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label>Payment Amount</Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={(selectedCustomerData?.current_balance || 0).toFixed(2)}
                      className="text-lg"
                    />
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button
                      className="w-full h-12 text-lg bg-amber-600 hover:bg-amber-700"
                      onClick={handleDuePayment}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Record Due Payment'}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setIsDuePaymentMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>NPR {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({(appSettings?.vatRatePercent ?? 13)}%)</span>
                    <span>NPR {vatAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Current Sale</span>
                    <span className="text-accent">NPR {total.toFixed(2)}</span>
                  </div>
                  
                  {selectedCustomerData && (selectedCustomerData.current_balance || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-amber-600">
                        <span>Previous Due</span>
                        <span>NPR {(selectedCustomerData.current_balance || 0).toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Payable</span>
                        <span className="text-accent">NPR {totalPayable.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2 pt-2">
                    <Label>Amount Paid</Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={totalPayable.toFixed(2)}
                      className="text-lg"
                    />
                  </div>

                  {remainingDue > 0 && (
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>Remaining Due</span>
                      <span>NPR {remainingDue.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <Button
                      className="w-full h-12 text-lg bg-accent hover:bg-accent/90 touch-manipulation"
                      onClick={handleCheckout}
                      disabled={loading || cart.length === 0}
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {loading ? 'Processing...' : 'Complete Sale'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full touch-manipulation" 
                      onClick={handlePrintInvoice}
                      disabled={!lastInvoice}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {lastInvoice ? `Download Invoice (${lastInvoice.invoiceNumber})` : 'No Invoice to Download'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
