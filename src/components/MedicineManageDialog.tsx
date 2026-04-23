import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { upsertMedicineBatch, normalizeText } from '@/hooks/useBatchUpsert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, ArrowLeft, Pill } from 'lucide-react';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';

type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;
type MedicineCategory = typeof Constants.public.Enums.medicine_category[number];

const CATEGORIES = Constants.public.Enums.medicine_category;

interface MedicineManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine: Medicine | null;
  onUpdated: () => void;
}

export default function MedicineManageDialog({
  open,
  onOpenChange,
  medicine,
  onUpdated,
}: MedicineManageDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  // Medicine form state
  const [medicineSubmitting, setMedicineSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    category: 'tablet' as MedicineCategory,
    manufacturer: '',
    description: '',
    unit: 'pcs',
    barcode: '',
    rack_no: '',
    requires_prescription: false,
    is_active: true,
  });

  // Batch state
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchFormData, setBatchFormData] = useState({
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
      setFormData({
        name: medicine.name,
        generic_name: medicine.generic_name || '',
        category: medicine.category,
        manufacturer: medicine.manufacturer || '',
        description: medicine.description || '',
        unit: medicine.unit || 'pcs',
        barcode: medicine.barcode || '',
        rack_no: medicine.rack_no || '',
        requires_prescription: medicine.requires_prescription || false,
        is_active: medicine.is_active ?? true,
      });
      fetchBatches();
      setActiveTab('details');
      setShowBatchForm(false);
    }
  }, [open, medicine?.id]);

  const fetchBatches = async () => {
    if (!medicine) return;
    setBatchLoading(true);
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
      setBatchLoading(false);
    }
  };

  const findDuplicateMedicineByName = async (name: string, excludeId?: string) => {
    const normalized = normalizeText(name);
    const { data, error } = await supabase
      .from('medicines')
      .select('id, name')
      .ilike('name', `%${normalized}%`)
      .limit(50);

    if (error) throw error;
    return data?.find((m) => {
      if (excludeId && m.id === excludeId) return false;
      return normalizeText(m.name) === normalized;
    }) ?? null;
  };

  const handleMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || medicineSubmitting) return;

    setMedicineSubmitting(true);
    try {
      const normalizedName = normalizeText(formData.name);
      const normalizedData = {
        ...formData,
        name: normalizedName,
        generic_name: formData.generic_name ? normalizeText(formData.generic_name) : null,
      };

      const duplicate = await findDuplicateMedicineByName(normalizedName, medicine.id);
      if (duplicate) {
        toast.error(`Medicine "${duplicate.name}" already exists.`);
        return;
      }

      const { error } = await supabase
        .from('medicines')
        .update(normalizedData)
        .eq('id', medicine.id);
      if (error) throw error;
      toast.success('Medicine updated successfully');
      onUpdated();
    } catch (error: unknown) {
      console.error('Error saving medicine:', error);
      const message = error instanceof Error ? error.message : 'Failed to save medicine';
      toast.error(message);
    } finally {
      setMedicineSubmitting(false);
    }
  };

  // Batch functions
  const resetBatchForm = () => {
    setBatchFormData({
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

  const openAddBatchForm = () => {
    resetBatchForm();
    setShowBatchForm(true);
  };

  const openEditBatchForm = (batch: MedicineBatch) => {
    setSelectedBatch(batch);
    setBatchFormData({
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      purchase_price: batch.purchase_price.toString(),
      selling_price: batch.selling_price.toString(),
      mrp: batch.mrp?.toString() || '',
      quantity: batch.quantity.toString(),
      min_stock_level: batch.min_stock_level?.toString() || '10',
    });
    setShowBatchForm(true);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || batchSubmitting) return;

    setBatchSubmitting(true);
    try {
      if (selectedBatch) {
        const { error } = await supabase
          .from('medicine_batches')
          .update({
            batch_number: normalizeText(batchFormData.batch_number),
            expiry_date: batchFormData.expiry_date,
            quantity: parseInt(batchFormData.quantity),
            purchase_price: parseFloat(batchFormData.purchase_price),
            selling_price: parseFloat(batchFormData.selling_price),
            mrp: batchFormData.mrp ? parseFloat(batchFormData.mrp) : null,
            min_stock_level: parseInt(batchFormData.min_stock_level),
          })
          .eq('id', selectedBatch.id);

        if (error) throw error;
        toast.success('Batch updated successfully');
      } else {
        const result = await upsertMedicineBatch({
          medicine_id: medicine.id,
          batch_number: normalizeText(batchFormData.batch_number),
          expiry_date: batchFormData.expiry_date,
          quantity: parseInt(batchFormData.quantity),
          purchase_price: parseFloat(batchFormData.purchase_price),
          selling_price: parseFloat(batchFormData.selling_price),
          mrp: batchFormData.mrp ? parseFloat(batchFormData.mrp) : undefined,
          min_stock_level: parseInt(batchFormData.min_stock_level),
        });
        if (!result) return;
      }

      setShowBatchForm(false);
      resetBatchForm();
      fetchBatches();
      onUpdated();
    } catch (error: any) {
      console.error('Error saving batch:', error);
      toast.error(error.message || 'Failed to save batch');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    try {
      const { error } = await supabase
        .from('medicine_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
      toast.success('Batch deleted successfully');
      fetchBatches();
      onUpdated();
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {medicine?.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="batches">Batches ({batches.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleMedicineSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Medicine Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generic_name">Generic Name</Label>
                  <Input
                    id="generic_name"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: MedicineCategory) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rack_no">Rack Number</Label>
                  <Input
                    id="rack_no"
                    value={formData.rack_no}
                    onChange={(e) => setFormData({ ...formData, rack_no: e.target.value })}
                    placeholder="e.g. A1, B2, Shelf-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs, strip, bottle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="requires_prescription"
                    checked={formData.requires_prescription}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requires_prescription: checked })
                    }
                  />
                  <Label htmlFor="requires_prescription">Requires Prescription</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={medicineSubmitting}>
                  {medicineSubmitting ? 'Saving...' : 'Update Medicine'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="batches" className="mt-4">
            {showBatchForm ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Button variant="ghost" size="sm" onClick={() => { setShowBatchForm(false); resetBatchForm(); }}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to List
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedBatch ? 'Edit Batch' : 'Add New Batch'}
                  </span>
                </div>

                <form onSubmit={handleBatchSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch_number">Batch Number *</Label>
                      <Input
                        id="batch_number"
                        value={batchFormData.batch_number}
                        onChange={(e) => setBatchFormData({ ...batchFormData, batch_number: e.target.value })}
                        placeholder="e.g. LOT-001, BN-2024"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry_date">Expiry Date *</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={batchFormData.expiry_date}
                        onChange={(e) => setBatchFormData({ ...batchFormData, expiry_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={batchFormData.quantity}
                        onChange={(e) => setBatchFormData({ ...batchFormData, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock_level">Min Stock Level</Label>
                      <Input
                        id="min_stock_level"
                        type="number"
                        value={batchFormData.min_stock_level}
                        onChange={(e) => setBatchFormData({ ...batchFormData, min_stock_level: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchase_price">Purchase Price *</Label>
                      <Input
                        id="purchase_price"
                        type="number"
                        step="0.01"
                        value={batchFormData.purchase_price}
                        onChange={(e) => setBatchFormData({ ...batchFormData, purchase_price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="selling_price">Selling Price *</Label>
                      <Input
                        id="selling_price"
                        type="number"
                        step="0.01"
                        value={batchFormData.selling_price}
                        onChange={(e) => setBatchFormData({ ...batchFormData, selling_price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="mrp">MRP</Label>
                      <Input
                        id="mrp"
                        type="number"
                        step="0.01"
                        value={batchFormData.mrp}
                        onChange={(e) => setBatchFormData({ ...batchFormData, mrp: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setShowBatchForm(false); resetBatchForm(); }} disabled={batchSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={batchSubmitting}>
                      {batchSubmitting ? 'Saving...' : selectedBatch ? 'Update Batch' : 'Add Batch'}
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
                  <Button onClick={openAddBatchForm} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Batch
                  </Button>
                </div>

                {batchLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading batches...</div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No batches found for this medicine</p>
                    <Button variant="outline" className="mt-4" onClick={openAddBatchForm}>
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
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditBatchForm(batch)}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteBatch(batch.id)}
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
