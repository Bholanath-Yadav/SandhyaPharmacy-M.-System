import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  Truck,
  Calendar,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useDataExport } from '@/hooks/useDataExport';
import { ExportDropdown } from '@/components/ExportDropdown';

type SalesInvoice = Tables<'sales_invoices'>;
type Customer = Tables<'customers'>;
type Supplier = Tables<'suppliers'>;
type MedicineBatch = Tables<'medicine_batches'>;

interface ReportStats {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  grossProfit: number;
  customerDues: number;
  supplierPayables: number;
  stockValue: number;
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    grossProfit: 0,
    customerDues: 0,
    supplierPayables: 0,
    stockValue: 0,
  });
  const [salesData, setSalesData] = useState<SalesInvoice[]>([]);
  const [lowStockItems, setLowStockItems] = useState<(MedicineBatch & { medicine_name: string })[]>([]);
  const [customerDues, setCustomerDues] = useState<Customer[]>([]);
  const [supplierPayables, setSupplierPayables] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { exportData } = useDataExport();

  const handleExport = (format: 'json' | 'csv' | 'excel' | 'pdf', dataType: string) => {
    const dateRange = { from: dateFrom, to: dateTo };
    
    switch (dataType) {
      case 'sales':
        const salesExport = salesData.map(s => ({
          'Invoice #': s.invoice_number,
          'Date': new Date(s.created_at).toLocaleDateString(),
          'Subtotal': s.subtotal,
          'VAT': s.vat_amount || 0,
          'Discount': s.discount_amount || 0,
          'Total': s.total_amount,
          'Paid': s.paid_amount || 0,
          'Due': s.due_amount || 0,
          'Payment Method': s.payment_method || '-',
        }));
        exportData(format, salesExport, { filename: `sales-report-${dateFrom}-to-${dateTo}`, title: 'Sales Report', dateRange });
        break;
      case 'stock':
        const stockExport = lowStockItems.map(item => ({
          'Medicine': item.medicine_name,
          'Current Stock': item.quantity,
          'Min Level': item.min_stock_level || 10,
          'Shortage': (item.min_stock_level || 10) - item.quantity,
        }));
        exportData(format, stockExport, { filename: `low-stock-report-${new Date().toISOString().split('T')[0]}`, title: 'Low Stock Alert' });
        break;
      case 'dues':
        const duesExport = customerDues.map(c => ({
          'Customer': c.name,
          'Phone': c.phone || '-',
          'Email': c.email || '-',
          'Address': c.address || '-',
          'Due Amount (NPR)': c.current_balance || 0,
          'Credit Limit (NPR)': c.credit_limit || 0,
        }));
        exportData(format, duesExport, { filename: `customer-dues-${new Date().toISOString().split('T')[0]}`, title: 'Customer Dues Report' });
        break;
      case 'payables':
        const payablesExport = supplierPayables.map(s => ({
          'Supplier': s.name,
          'Contact Person': s.contact_person || '-',
          'Phone': s.phone || '-',
          'Email': s.email || '-',
          'Payable Amount (NPR)': s.current_balance || 0,
        }));
        exportData(format, payablesExport, { filename: `supplier-payables-${new Date().toISOString().split('T')[0]}`, title: 'Supplier Payables Report' });
        break;
      case 'summary':
        const summaryExport = [
          { 'Metric': 'Total Sales', 'Value (NPR)': stats.totalSales },
          { 'Metric': 'Total Purchases', 'Value (NPR)': stats.totalPurchases },
          { 'Metric': 'Total Expenses', 'Value (NPR)': stats.totalExpenses },
          { 'Metric': 'Gross Profit', 'Value (NPR)': stats.grossProfit },
          { 'Metric': 'Customer Dues', 'Value (NPR)': stats.customerDues },
          { 'Metric': 'Supplier Payables', 'Value (NPR)': stats.supplierPayables },
          { 'Metric': 'Current Stock Value', 'Value (NPR)': stats.stockValue },
        ];
        exportData(format, summaryExport, { filename: `summary-report-${dateFrom}-to-${dateTo}`, title: 'Summary Report', dateRange });
        break;
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateFrom, dateTo]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch sales
      const { data: sales } = await supabase
        .from('sales_invoices')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');
      
      const totalSales = sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
      setSalesData(sales || []);

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');
      
      const totalPurchases = purchases?.reduce((sum, p) => sum + p.total_amount, 0) || 0;

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo);
      
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

      // Fetch customer dues
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .gt('current_balance', 0)
        .order('current_balance', { ascending: false });
      
      setCustomerDues(customers || []);
      const customerDuesTotal = customers?.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 0;

      // Fetch supplier payables
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('*')
        .gt('current_balance', 0)
        .order('current_balance', { ascending: false });
      
      setSupplierPayables(suppliers || []);
      const supplierPayablesTotal = suppliers?.reduce((sum, s) => sum + (s.current_balance || 0), 0) || 0;

      // Fetch stock value
      const { data: batches } = await supabase
        .from('medicine_batches')
        .select('quantity, purchase_price, min_stock_level, medicine_id, medicines(name)')
        .gt('quantity', 0);
      
      const stockValue = batches?.reduce((sum, b) => sum + (b.quantity * b.purchase_price), 0) || 0;
      
      // Low stock items
      const lowStock = batches?.filter(b => b.quantity <= (b.min_stock_level || 10))
        .map(b => ({
          ...b,
          medicine_name: (b.medicines as any)?.name || 'Unknown',
        })) || [];
      setLowStockItems(lowStock as any);

      setStats({
        totalSales,
        totalPurchases,
        totalExpenses,
        grossProfit: totalSales - totalPurchases - totalExpenses,
        customerDues: customerDuesTotal,
        supplierPayables: supplierPayablesTotal,
        stockValue,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Sales', value: stats.totalSales, icon: TrendingUp, color: 'text-pharmacy-success', bgColor: 'bg-pharmacy-success/10' },
    { title: 'Total Purchases', value: stats.totalPurchases, icon: TrendingDown, color: 'text-pharmacy-info', bgColor: 'bg-pharmacy-info/10' },
    { title: 'Total Expenses', value: stats.totalExpenses, icon: DollarSign, color: 'text-pharmacy-warning', bgColor: 'bg-pharmacy-warning/10' },
    { title: 'Gross Profit', value: stats.grossProfit, icon: BarChart3, color: stats.grossProfit >= 0 ? 'text-pharmacy-success' : 'text-pharmacy-danger', bgColor: stats.grossProfit >= 0 ? 'bg-pharmacy-success/10' : 'bg-pharmacy-danger/10' },
    { title: 'Customer Dues', value: stats.customerDues, icon: Users, color: 'text-pharmacy-danger', bgColor: 'bg-pharmacy-danger/10' },
    { title: 'Supplier Payables', value: stats.supplierPayables, icon: Truck, color: 'text-pharmacy-warning', bgColor: 'bg-pharmacy-warning/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Business analytics and insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
          </div>
          <ExportDropdown 
            onExport={(format) => handleExport(format, 'summary')} 
            disabled={loading}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {loading ? '...' : `NPR ${card.value.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock Value Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <Package className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Stock Value</p>
              <p className="text-2xl font-bold text-accent">
                {loading ? '...' : `NPR ${stats.stockValue.toLocaleString()}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Tabs defaultValue="sales">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="stock">Low Stock</TabsTrigger>
          <TabsTrigger value="dues">Customer Dues</TabsTrigger>
          <TabsTrigger value="payables">Supplier Payables</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sales Report</CardTitle>
              <ExportDropdown 
                onExport={(format) => handleExport(format, 'sales')} 
                disabled={salesData.length === 0}
              />
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sales in selected period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                          <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{sale.subtotal.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{(sale.vat_amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{sale.total_amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{(sale.paid_amount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Low Stock Alert</CardTitle>
              <ExportDropdown 
                onExport={(format) => handleExport(format, 'stock')} 
                disabled={lowStockItems.length === 0}
              />
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  All items are well stocked
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Min Level</TableHead>
                        <TableHead className="text-right">Shortage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.medicine_name}</TableCell>
                          <TableCell className="text-right text-pharmacy-danger">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.min_stock_level || 10}</TableCell>
                          <TableCell className="text-right text-pharmacy-danger">
                            {(item.min_stock_level || 10) - item.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dues">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Customer Dues</CardTitle>
              <ExportDropdown 
                onExport={(format) => handleExport(format, 'dues')} 
                disabled={customerDues.length === 0}
              />
            </CardHeader>
            <CardContent>
              {customerDues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No customer dues
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Due Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerDues.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone || '-'}</TableCell>
                          <TableCell className="text-right text-pharmacy-danger font-medium">
                            NPR {(customer.current_balance || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Supplier Payables</CardTitle>
              <ExportDropdown 
                onExport={(format) => handleExport(format, 'payables')} 
                disabled={supplierPayables.length === 0}
              />
            </CardHeader>
            <CardContent>
              {supplierPayables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No supplier payables
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Payable Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierPayables.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>{supplier.phone || '-'}</TableCell>
                          <TableCell className="text-right text-pharmacy-warning font-medium">
                            NPR {(supplier.current_balance || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
