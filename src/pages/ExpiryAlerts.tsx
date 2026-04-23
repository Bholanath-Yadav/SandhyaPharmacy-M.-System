import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { AlertTriangle, Calendar, Package, AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;

interface ExpiryItem {
  medicine: Medicine;
  batch: MedicineBatch;
  daysUntilExpiry: number;
}

export default function ExpiryAlerts() {
  const [expired, setExpired] = useState<ExpiryItem[]>([]);
  const [expiringThisMonth, setExpiringThisMonth] = useState<ExpiryItem[]>([]);
  const [expiringNext3Months, setExpiringNext3Months] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiryData();
  }, []);

  const fetchExpiryData = async () => {
    try {
      const { data: batches } = await supabase
        .from('medicine_batches')
        .select('*, medicines(*)')
        .gt('quantity', 0)
        .order('expiry_date');

      if (!batches) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneMonthFromNow = new Date(today);
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      
      const threeMonthsFromNow = new Date(today);
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      const expiredItems: ExpiryItem[] = [];
      const thisMonthItems: ExpiryItem[] = [];
      const next3MonthsItems: ExpiryItem[] = [];

      batches.forEach((batch) => {
        const expiryDate = new Date(batch.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const item: ExpiryItem = {
          medicine: batch.medicines as unknown as Medicine,
          batch: batch,
          daysUntilExpiry,
        };

        if (expiryDate < today) {
          expiredItems.push(item);
        } else if (expiryDate <= oneMonthFromNow) {
          thisMonthItems.push(item);
        } else if (expiryDate <= threeMonthsFromNow) {
          next3MonthsItems.push(item);
        }
      });

      setExpired(expiredItems);
      setExpiringThisMonth(thisMonthItems);
      setExpiringNext3Months(next3MonthsItems);
    } catch (error) {
      console.error('Error fetching expiry data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (items: ExpiryItem[], type: 'expired' | 'warning' | 'caution') => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No items found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Batch Number</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Value (NPR)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={`${item.batch.id}-${index}`}>
                <TableCell>
                  <p className="font-medium">{item.medicine?.name || 'Unknown'}</p>
                  {item.medicine?.generic_name && (
                    <p className="text-sm text-muted-foreground">{item.medicine.generic_name}</p>
                  )}
                </TableCell>
                <TableCell>{item.batch.batch_number}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(item.batch.expiry_date).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.batch.quantity}</TableCell>
                <TableCell className="text-right">
                  {(item.batch.quantity * item.batch.purchase_price).toLocaleString()}
                </TableCell>
                <TableCell>
                  {type === 'expired' ? (
                    <Badge className="bg-pharmacy-danger/10 text-pharmacy-danger border-pharmacy-danger/20">
                      Expired ({Math.abs(item.daysUntilExpiry)} days ago)
                    </Badge>
                  ) : type === 'warning' ? (
                    <Badge className="bg-pharmacy-warning/10 text-pharmacy-warning border-pharmacy-warning/20">
                      {item.daysUntilExpiry} days left
                    </Badge>
                  ) : (
                    <Badge className="bg-pharmacy-info/10 text-pharmacy-info border-pharmacy-info/20">
                      {item.daysUntilExpiry} days left
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const totalExpiredValue = expired.reduce((sum, i) => sum + (i.batch.quantity * i.batch.purchase_price), 0);
  const totalThisMonthValue = expiringThisMonth.reduce((sum, i) => sum + (i.batch.quantity * i.batch.purchase_price), 0);
  const totalNext3MonthsValue = expiringNext3Months.reduce((sum, i) => sum + (i.batch.quantity * i.batch.purchase_price), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expiry Alerts</h1>
        <p className="text-muted-foreground mt-1">Monitor medicine expiry dates and take action</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-pharmacy-danger/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pharmacy-danger/10">
                <AlertCircle className="h-6 w-6 text-pharmacy-danger" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired Items</p>
                <p className="text-2xl font-bold text-pharmacy-danger">{expired.length}</p>
                <p className="text-sm text-pharmacy-danger">NPR {totalExpiredValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-pharmacy-warning/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pharmacy-warning/10">
                <AlertTriangle className="h-6 w-6 text-pharmacy-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring This Month</p>
                <p className="text-2xl font-bold text-pharmacy-warning">{expiringThisMonth.length}</p>
                <p className="text-sm text-pharmacy-warning">NPR {totalThisMonthValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-pharmacy-info/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pharmacy-info/10">
                <Calendar className="h-6 w-6 text-pharmacy-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring in 3 Months</p>
                <p className="text-2xl font-bold text-pharmacy-info">{expiringNext3Months.length}</p>
                <p className="text-sm text-pharmacy-info">NPR {totalNext3MonthsValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Tabs defaultValue="expired">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="expired" className="text-pharmacy-danger data-[state=active]:bg-pharmacy-danger/10">
                  Expired ({expired.length})
                </TabsTrigger>
                <TabsTrigger value="thisMonth" className="text-pharmacy-warning data-[state=active]:bg-pharmacy-warning/10">
                  This Month ({expiringThisMonth.length})
                </TabsTrigger>
                <TabsTrigger value="next3Months" className="text-pharmacy-info data-[state=active]:bg-pharmacy-info/10">
                  Next 3 Months ({expiringNext3Months.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="expired" className="mt-4">
                {renderTable(expired, 'expired')}
              </TabsContent>

              <TabsContent value="thisMonth" className="mt-4">
                {renderTable(expiringThisMonth, 'warning')}
              </TabsContent>

              <TabsContent value="next3Months" className="mt-4">
                {renderTable(expiringNext3Months, 'caution')}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
