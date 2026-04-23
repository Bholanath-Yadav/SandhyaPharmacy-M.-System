import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { upsertMedicineBatch, normalizeText } from '@/hooks/useBatchUpsert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, ArrowLeft } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;

interface ManageBatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine: Medicine | null;
  onBatchesUpdated: () => void;
}

export default function ManageBatchesDialog({
  open,
  onOpenChange,
  medicine,
  onBatchesUpdated,
}: ManageBatchesDialogProps) {
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    batch_number: '',
    expiry_date: '',
    purchase_price: '',
    selling_price: '',
    mrp: '',
    quantity: '',
    min_stock_level: '10',
  });

  useEffect(() => {
    if (open && medicine) {
      fetchBatches();
      resetForm();
      setShowForm(false);
    }
  }, [open, medicine?.id]);

  const fetchBatches = async () => {
    if (!medicine) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medicine_batches')
        .select('*')
        .eq('medicine_id', medicine.id)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      batch_number: '',
      expiry_date: '',
      purchase_price: '',
      selling_price: '',
      mrp: '',
      quantity: '',
      min_stock_level: '10',
    });
    setSelectedBatch(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (batch: MedicineBatch) => {
    setSelectedBatch(batch);
    setFormData({
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      purchase_price: batch.purchase_price.toString(),
      selling_price: batch.selling_price.toString(),
      mrp: batch.mrp?.toString() || '',
      quantity: batch.quantity.toString(),
      min_stock_level: batch.min_stock_level?.toString() || '10',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || submitting) return;

    setSubmitting(true);
    try {
      if (selectedBatch) {
        // Update existing batch
        const { error } = await supabase
          .from('medicine_batches')
          .update({
            batch_number: normalizeText(formData.batch_number),
            expiry_date: formData.expiry_date,
            quantity: parseInt(formData.quantity),
            purchase_price: parseFloat(formData.purchase_price),
            selling_price: parseFloat(formData.selling_price),
            mrp: formData.mrp ? parseFloat(formData.mrp) : null,
            min_stock_level: parseInt(formData.min_stock_level),
          })
          .eq('id', selectedBatch.id);

        if (error) throw error;
        toast.success('Batch updated successfully');
      } else {
        // Add new batch using upsert
        const result = await upsertMedicineBatch({
          medicine_id: medicine.id,
          batch_number: normalizeText(formData.batch_number),
          expiry_date: formData.expiry_date,
          quantity: parseInt(formData.quantity),
          purchase_price: parseFloat(formData.purchase_price),
          selling_price: parseFloat(formData.selling_price),
          mrp: formData.mrp ? parseFloat(formData.mrp) : undefined,
          min_stock_level: parseInt(formData.min_stock_level),
        });
        if (!result) return;
      }

      setShowForm(false);
      resetForm();
      fetchBatches();
      onBatchesUpdated();
    } catch (error: any) {
      console.error('Error saving batch:', error);
      toast.error(error.message || 'Failed to save batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    try {
      const { error } = await supabase
        .from('medicine_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
      toast.success('Batch deleted successfully');
      fetchBatches();
      onBatchesUpdated();
    } catch (error: any) {
      console.error('Error deleting batch:', error);
      toast.error(error.message || 'Failed to delete batch');
    }
  };

  const isExpired = (date: string) => new Date(date) < new Date();
  const isExpiringSoon = (date: string) => {
    const expiryDate = new Date(date);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow && expiryDate >= new Date();
  };

  const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Manage Batches - {medicine?.name}
          </DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to List
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedBatch ? 'Edit Batch' : 'Add New Batch'}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch_number">Batch Number *</Label>
                  <Input
                    id="batch_number"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="e.g. LOT-001, BN-2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date *</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price *</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="mrp">MRP</Label>
                  <Input
                    id="mrp"
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : selectedBatch ? 'Update Batch' : 'Add Batch'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Total Stock: <span className="font-semibold text-foreground">{totalStock}</span>
              </div>
              <Button onClick={openAddForm} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Batch
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading batches...</div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No batches found for this medicine</p>
                <Button variant="outline" className="mt-4" onClick={openAddForm}>
                  Add First Batch
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Purchase</TableHead>
                      <TableHead className="text-right">Selling</TableHead>
                      <TableHead className="text-right">MRP</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batch_number}</TableCell>
                        <TableCell>
                          <span className={`${isExpired(batch.expiry_date) ? 'text-destructive font-medium' : isExpiringSoon(batch.expiry_date) ? 'text-yellow-600 font-medium' : ''}`}>
                            {new Date(batch.expiry_date).toLocaleDateString()}
                          </span>
                          {isExpired(batch.expiry_date) && (
                            <Badge variant="destructive" className="ml-2 text-xs">Expired</Badge>
                          )}
                          {isExpiringSoon(batch.expiry_date) && !isExpired(batch.expiry_date) && (
                            <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-600">Soon</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={batch.quantity <= (batch.min_stock_level || 10) ? 'text-destructive font-medium' : ''}>
                            {batch.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">Rs. {batch.purchase_price}</TableCell>
                        <TableCell className="text-right">Rs. {batch.selling_price}</TableCell>
                        <TableCell className="text-right">{batch.mrp ? `Rs. ${batch.mrp}` : '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditForm(batch)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(batch.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
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
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
