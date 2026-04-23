import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeText } from '@/hooks/useBatchUpsert';
import { useAuth } from '@/contexts/AuthContext';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Pill } from 'lucide-react';
import MergeDuplicateMedicines from '@/components/MergeDuplicateMedicines';
import MedicineManageDialog from '@/components/MedicineManageDialog';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';

type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;
type MedicineCategory = typeof Constants.public.Enums.medicine_category[number];

const CATEGORIES = Constants.public.Enums.medicine_category;

export default function Medicines() {
  const { isAdmin } = useAuth();
  const [medicines, setMedicines] = useState<(Medicine & { batches: MedicineBatch[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
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

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('*, medicine_batches(*)')
        .order('name');

      if (error) throw error;

      const medicinesWithBatches = data?.map(m => ({
        ...m,
        batches: m.medicine_batches || [],
      })) || [];

      setMedicines(medicinesWithBatches);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      toast.error('Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  };

  const [medicineSubmitting, setMedicineSubmitting] = useState(false);

  const findDuplicateMedicineByName = async (name: string, excludeId?: string) => {
    const normalized = normalizeText(name);

    // We can't TRIM() server-side in filters, so we fetch close matches and compare after normalizing.
    const { data, error } = await supabase
      .from('medicines')
      .select('id, name')
      .ilike('name', `%${normalized}%`)
      .limit(50);

    if (error) throw error;

    return (
      data?.find((m) => {
        if (excludeId && m.id === excludeId) return false;
        return normalizeText(m.name) === normalized;
      }) ?? null
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (medicineSubmitting) return;

    setMedicineSubmitting(true);
    try {
      const normalizedName = normalizeText(formData.name);
      const normalizedData = {
        ...formData,
        name: normalizedName,
        generic_name: formData.generic_name ? normalizeText(formData.generic_name) : null,
      };

      const duplicate = await findDuplicateMedicineByName(
        normalizedName,
        selectedMedicine?.id
      );

      if (duplicate) {
        toast.error(`Medicine "${duplicate.name}" already exists.`);
        return;
      }

      if (selectedMedicine) {
        const { error } = await supabase
          .from('medicines')
          .update(normalizedData)
          .eq('id', selectedMedicine.id);
        if (error) throw error;
        toast.success('Medicine updated successfully');
      } else {
        const { error } = await supabase
          .from('medicines')
          .insert(normalizedData as TablesInsert<'medicines'>);
        if (error) throw error;
        toast.success('Medicine added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMedicines();
    } catch (error: unknown) {
      console.error('Error saving medicine:', error);
      const message = error instanceof Error ? error.message : 'Failed to save medicine';
      toast.error(message);
    } finally {
      setMedicineSubmitting(false);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    try {
      const { error } = await supabase.from('medicines').delete().eq('id', id);
      if (error) throw error;
      toast.success('Medicine deleted successfully');
      fetchMedicines();
    } catch (error: any) {
      console.error('Error deleting medicine:', error);
      toast.error(error.message || 'Failed to delete medicine');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      generic_name: '',
      category: 'tablet',
      manufacturer: '',
      description: '',
      unit: 'pcs',
      barcode: '',
      rack_no: '',
      requires_prescription: false,
      is_active: true,
    });
    setSelectedMedicine(null);
  };

  const openManageDialog = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setIsManageDialogOpen(true);
  };

  const filteredMedicines = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.barcode?.includes(searchTerm) ||
      m.rack_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalStock = (batches: MedicineBatch[]) => {
    return batches.reduce((sum, b) => sum + b.quantity, 0);
  };

  const hasOnlyExpiredBatches = (batches: MedicineBatch[]) => {
    if (batches.length === 0) return true;
    return batches.every((batch) => new Date(batch.expiry_date) < new Date());
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Medicines</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your medicine inventory</p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <MergeDuplicateMedicines medicines={medicines} onMergeComplete={fetchMedicines} />
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-accent hover:bg-accent/90 w-full sm:w-auto h-11 sm:h-10"
                  onClick={() => {
                    resetForm(); // Clear any previously selected medicine before opening
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Medicine
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedMedicine ? 'Edit Medicine' : 'Add New Medicine'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="space-y-2">
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={medicineSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={medicineSubmitting}>
                  {medicineSubmitting ? 'Saving...' : `${selectedMedicine ? 'Update' : 'Add'} Medicine`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        )}
      </div>

      {/* Medicine Manage Dialog (Edit + Batches) */}
      <MedicineManageDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        medicine={selectedMedicine}
        onUpdated={fetchMedicines}
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, generic name, barcode, or rack..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No medicines found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                Add your first medicine
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredMedicines.map((medicine) => {
                  const totalStock = getTotalStock(medicine.batches);
                  const isLowStock = totalStock <= 10;
                  return (
                    <div key={medicine.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{medicine.name}</p>
                          {medicine.generic_name && (
                            <p className="text-sm text-muted-foreground truncate">{medicine.generic_name}</p>
                          )}
                        </div>
                        {medicine.is_active ? (
                          <Badge className="bg-pharmacy-success/10 text-pharmacy-success border-pharmacy-success/20 flex-shrink-0">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex-shrink-0">Inactive</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="secondary" className="text-xs">
                          {medicine.category.charAt(0).toUpperCase() + medicine.category.slice(1)}
                        </Badge>
                        {medicine.rack_no && (
                          <span className="text-muted-foreground">Rack: {medicine.rack_no}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Stock:</span>
                          <span className={`font-semibold ${isLowStock ? 'text-pharmacy-danger' : ''}`}>
                            {totalStock}
                          </span>
                        </div>
                        
                        {isAdmin ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openManageDialog(medicine)}
                              className="h-8 px-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {hasOnlyExpiredBatches(medicine.batches) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(medicine.id)}
                                className="h-8 px-2 text-destructive hover:text-destructive"
                                title="Delete (all batches expired)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">View only</span>
                        )}
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
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rack No</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedicines.map((medicine) => {
                      const totalStock = getTotalStock(medicine.batches);
                      const isLowStock = totalStock <= 10;
                      return (
                        <TableRow key={medicine.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{medicine.name}</p>
                              {medicine.generic_name && (
                                <p className="text-sm text-muted-foreground">{medicine.generic_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {medicine.category.charAt(0).toUpperCase() + medicine.category.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{medicine.rack_no || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-medium ${isLowStock ? 'text-pharmacy-danger' : ''}`}>
                              {totalStock}
                            </span>
                          </TableCell>
                          <TableCell>
                            {medicine.is_active ? (
                              <Badge className="bg-pharmacy-success/10 text-pharmacy-success border-pharmacy-success/20">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openManageDialog(medicine)}
                                  title="Manage Medicine"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {hasOnlyExpiredBatches(medicine.batches) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(medicine.id)}
                                    className="text-destructive hover:text-destructive"
                                    title="Delete (all batches expired)"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">View only</span>
                            )}
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
    </div>
  );
}
