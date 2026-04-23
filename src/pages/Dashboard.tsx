import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  Pill,
  Wallet,
  BarChart3,
  TrendingDown,
  Eye,
  Activity,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NepalTime from '@/components/NepalTime';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';

interface DashboardStats {
  todaySales: number;
  totalStock: number;
  totalCustomers: number;
  expiringItems: number;
  totalDues: number;
  lowStockItems: number;
  todayProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  yesterdaySales: number;
  totalProfit: number;
  totalOrders: number;
}

interface SalesData {
  day: string;
  sales: number;
  profit: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS = [
  'hsl(160, 60%, 45%)',  // Teal/Green
  'hsl(38, 85%, 55%)',   // Orange
  'hsl(15, 85%, 55%)',   // Coral
  'hsl(199, 89%, 48%)',  // Blue
  'hsl(280, 60%, 50%)',  // Purple
  'hsl(142, 76%, 36%)',  // Green
];

// Gradient colors for bar chart
const BAR_COLORS = [
  'hsl(160, 60%, 45%)',
  'hsl(160, 55%, 48%)',
  'hsl(120, 50%, 50%)',
  'hsl(80, 55%, 52%)',
  'hsl(50, 70%, 55%)',
  'hsl(38, 85%, 55%)',
  'hsl(15, 85%, 55%)',
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    totalStock: 0,
    totalCustomers: 0,
    expiringItems: 0,
    totalDues: 0,
    lowStockItems: 0,
    todayProfit: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    yesterdaySales: 0,
    totalProfit: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [weeklySalesData, setWeeklySalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ name: string; action: string; time: string; avatar: string }[]>([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchWeeklySalesData();
    fetchCategoryData();
    fetchRecentActivity();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
      const yesterdayEnd = todayStart;

      // Get today's sales
      const { data: salesInvoices } = await supabase
        .from('sales_invoices')
        .select('id, total_amount')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd);

      const todaySales = salesInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

      // Get yesterday's sales for comparison
      const { data: yesterdaySalesData } = await supabase
        .from('sales_invoices')
        .select('total_amount')
        .gte('created_at', yesterdayStart)
        .lt('created_at', yesterdayEnd);

      const yesterdaySales = yesterdaySalesData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

      // Get total revenue (all time) and total orders
      const { data: allSales } = await supabase
        .from('sales_invoices')
        .select('id, total_amount');
      const totalRevenue = allSales?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
      const totalOrders = allSales?.length || 0;

      // Get total expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount');
      const totalExpenses = expensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      // Get today's profit
      let todayProfit = 0;
      if (salesInvoices && salesInvoices.length > 0) {
        const invoiceIds = salesInvoices.map(inv => inv.id);
        const { data: saleItems } = await supabase
          .from('sale_items')
          .select('quantity, unit_price, batch_id')
          .in('invoice_id', invoiceIds);

        if (saleItems) {
          const batchIds = [...new Set(saleItems.map(item => item.batch_id))];
          const { data: batches } = await supabase
            .from('medicine_batches')
            .select('id, purchase_price')
            .in('id', batchIds);

          const batchPriceMap = new Map(batches?.map(b => [b.id, b.purchase_price]) || []);

          for (const item of saleItems) {
            const purchasePrice = batchPriceMap.get(item.batch_id) || 0;
            const saleAmount = item.quantity * item.unit_price;
            const costAmount = item.quantity * purchasePrice;
            todayProfit += saleAmount - costAmount;
          }
        }
      }

      // Get total profit (all time)
      let totalProfit = 0;
      if (allSales && allSales.length > 0) {
        const allInvoiceIds = allSales.map(inv => inv.id);
        const { data: allSaleItems } = await supabase
          .from('sale_items')
          .select('quantity, unit_price, batch_id')
          .in('invoice_id', allInvoiceIds);

        if (allSaleItems) {
          const allBatchIds = [...new Set(allSaleItems.map(item => item.batch_id))];
          const { data: allBatches } = await supabase
            .from('medicine_batches')
            .select('id, purchase_price')
            .in('id', allBatchIds);

          const allBatchPriceMap = new Map(allBatches?.map(b => [b.id, b.purchase_price]) || []);

          for (const item of allSaleItems) {
            const purchasePrice = allBatchPriceMap.get(item.batch_id) || 0;
            const saleAmount = item.quantity * item.unit_price;
            const costAmount = item.quantity * purchasePrice;
            totalProfit += saleAmount - costAmount;
          }
        }
      }

      // Get total stock
      const { data: stockData } = await supabase
        .from('medicine_batches')
        .select('quantity')
        .gt('quantity', 0);

      const totalStock = stockData?.reduce((sum, batch) => sum + batch.quantity, 0) || 0;

      // Get total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get expiring items (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { count: expiringCount } = await supabase
        .from('medicine_batches')
        .select('*', { count: 'exact', head: true })
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('quantity', 0);

      // Get customer dues
      const { data: duesData } = await supabase
        .from('customers')
        .select('current_balance')
        .gt('current_balance', 0);

      const totalDues = duesData?.reduce((sum, c) => sum + Number(c.current_balance), 0) || 0;

      // Get low stock items
      const { data: lowStockData } = await supabase
        .from('medicine_batches')
        .select('quantity, min_stock_level')
        .gt('quantity', 0);

      const lowStockItems = lowStockData?.filter(b => b.quantity <= (b.min_stock_level || 10)).length || 0;

      setStats({
        todaySales,
        totalStock,
        totalCustomers: customerCount || 0,
        expiringItems: expiringCount || 0,
        totalDues,
        lowStockItems,
        todayProfit,
        totalRevenue,
        totalExpenses,
        yesterdaySales,
        totalProfit,
        totalOrders,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySalesData = async () => {
    try {
      const days: SalesData[] = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

        const { data: salesData } = await supabase
          .from('sales_invoices')
          .select('id, total_amount')
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd);

        const sales = salesData?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

        let profit = 0;
        if (salesData && salesData.length > 0) {
          const invoiceIds = salesData.map(inv => inv.id);
          const { data: saleItems } = await supabase
            .from('sale_items')
            .select('quantity, unit_price, batch_id')
            .in('invoice_id', invoiceIds);

          if (saleItems) {
            const batchIds = [...new Set(saleItems.map(item => item.batch_id))];
            const { data: batches } = await supabase
              .from('medicine_batches')
              .select('id, purchase_price')
              .in('id', batchIds);

            const batchPriceMap = new Map(batches?.map(b => [b.id, b.purchase_price]) || []);

            for (const item of saleItems) {
              const purchasePrice = batchPriceMap.get(item.batch_id) || 0;
              const saleAmount = item.quantity * item.unit_price;
              const costAmount = item.quantity * purchasePrice;
              profit += saleAmount - costAmount;
            }
          }
        }

        const dayName = dayNames[date.getDay()];
        days.push({ day: dayName, sales, profit });
      }

      setWeeklySalesData(days);
    } catch (error) {
      console.error('Error fetching weekly sales:', error);
    }
  };

  const fetchCategoryData = async () => {
    try {
      const { data: medicines } = await supabase
        .from('medicines')
        .select('category');

      if (medicines) {
        const categoryCount: Record<string, number> = {};
        medicines.forEach(med => {
          const cat = med.category || 'other';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        const data = Object.entries(categoryCount).map(([name, value], index) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));

        setCategoryData(data);
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: recentSales } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, total_amount, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(4);

      if (recentSales) {
        const activities = recentSales.map((sale, index) => {
          const colors = ['bg-primary', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500'];
          const timeAgo = getTimeAgo(new Date(sale.created_at));
          return {
            name: `Invoice #${sale.invoice_number}`,
            action: `Sale of NPR ${Number(sale.total_amount).toLocaleString()}`,
            time: timeAgo,
            avatar: colors[index % colors.length],
          };
        });
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const salesChangePercent = stats.yesterdaySales > 0 
    ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales * 100).toFixed(1)
    : stats.todaySales > 0 ? '100' : '0';

  const isPositiveChange = Number(salesChangePercent) >= 0;
  const totalMedicines = categoryData.reduce((sum, cat) => sum + cat.value, 0);

  const chartConfig = {
    sales: { label: 'Sales', color: 'hsl(160, 60%, 45%)' },
    profit: { label: 'Profit', color: 'hsl(142, 76%, 36%)' },
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Top categories for display
  const topCategories = categoryData.slice(0, 4).map((cat, index) => ({
    ...cat,
    percentage: totalMedicines > 0 ? Math.round((cat.value / totalMedicines) * 100) : 0,
    rank: index + 1,
  }));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <NepalTime />
          <Link to="/sales">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
              <ShoppingCart className="mr-2 h-4 w-4" />
              New Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="glass-card stat-card-glow stat-border-green rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {loading ? '...' : `NPR ${formatCurrency(stats.totalRevenue)}`}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary font-medium">+{salesChangePercent}%</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/20">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="glass-card stat-card-glow stat-border-blue rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Customers</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {loading ? '...' : formatNumber(stats.totalCustomers)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Users className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">Active</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="glass-card stat-card-glow stat-border-orange rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {loading ? '...' : formatNumber(stats.totalOrders)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Activity className="h-3 w-3 text-orange-400" />
                <span className="text-xs text-orange-400 font-medium">All time</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/20">
              <ShoppingCart className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Profit Rate */}
        <div className="glass-card stat-card-glow stat-border-coral rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Profit Rate</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {loading ? '...' : `${stats.totalRevenue > 0 ? Math.round((stats.totalProfit / stats.totalRevenue) * 100) : 0}%`}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-rose-400" />
                <span className="text-xs text-rose-400 font-medium">Healthy</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/20">
              <TrendingUp className="h-6 w-6 text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Sales Overview</h3>
              <p className="text-sm text-muted-foreground">Daily sales and profit trends</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs bg-secondary/50 border-border">7 Days</Button>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">30 Days</Button>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">90 Days</Button>
            </div>
          </div>
          
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={weeklySalesData} barSize={32} barGap={8}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(150, 15%, 60%)', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(150, 15%, 60%)', fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                cursor={{ fill: 'hsl(160, 25%, 15%)' }}
              />
              <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                {weeklySalesData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Top Categories */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Top Categories</h3>
              <p className="text-sm text-muted-foreground">Medicine categories breakdown</p>
            </div>
          </div>

          <div className="space-y-4">
            {topCategories.map((cat, index) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.rank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    <span className="text-sm text-muted-foreground">{cat.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Donut Chart */}
          <div className="relative h-[160px] mt-6">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{totalMedicines}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Today's Sales</span>
              </div>
              <span className="font-semibold text-foreground">NPR {formatCurrency(stats.todaySales)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-sm text-muted-foreground">Today's Profit</span>
              </div>
              <span className="font-semibold text-green-400">NPR {formatCurrency(stats.todayProfit)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Package className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm text-muted-foreground">Total Stock</span>
              </div>
              <span className="font-semibold text-foreground">{formatNumber(stats.totalStock)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Wallet className="h-4 w-4 text-orange-400" />
                </div>
                <span className="text-sm text-muted-foreground">Pending Dues</span>
              </div>
              <span className="font-semibold text-orange-400">NPR {formatCurrency(stats.totalDues)}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <Link to="/invoices">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${activity.avatar} flex items-center justify-center text-white text-sm font-semibold`}>
                    {activity.name.split('#')[1]?.slice(0, 2) || 'IN'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.name}</p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {activity.time}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Alerts</h3>
            <Link to="/expiry-alerts">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {stats.expiringItems > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{stats.expiringItems} items expiring</p>
                  <p className="text-xs text-muted-foreground">Within 30 days</p>
                </div>
              </div>
            )}

            {stats.lowStockItems > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <div className="p-2 rounded-lg bg-rose-500/20">
                  <Package className="h-4 w-4 text-rose-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{stats.lowStockItems} low stock items</p>
                  <p className="text-xs text-muted-foreground">Below minimum level</p>
                </div>
              </div>
            )}

            {stats.totalDues > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Wallet className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">NPR {formatCurrency(stats.totalDues)} pending</p>
                  <p className="text-xs text-muted-foreground">Customer dues</p>
                </div>
              </div>
            )}

            {stats.expiringItems === 0 && stats.lowStockItems === 0 && stats.totalDues === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alerts at the moment</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/medicines">
                <Button variant="outline" size="sm" className="w-full text-xs bg-secondary/30 border-border hover:bg-secondary/50">
                  <Pill className="h-3 w-3 mr-1" />
                  Medicines
                </Button>
              </Link>
              <Link to="/reports">
                <Button variant="outline" size="sm" className="w-full text-xs bg-secondary/30 border-border hover:bg-secondary/50">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Reports
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
