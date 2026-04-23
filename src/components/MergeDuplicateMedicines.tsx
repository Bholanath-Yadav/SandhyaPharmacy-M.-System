import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeText } from '@/hooks/useBatchUpsert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { GitMerge, AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Medicine = Tables<'medicines'>;
type MedicineBatch = Tables<'medicine_batches'>;

interface MedicineWithBatches extends Medicine {
  batches: MedicineBatch[];
}

interface DuplicateGroup {
  normalizedName: string;
  medicines: MedicineWithBatches[];
}

interface Props {
  medicines: MedicineWithBatches[];
  onMergeComplete: () => void;
}

export default function MergeDuplicateMedicines({ medicines, onMergeComplete }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryMedicineId, setPrimaryMedicineId] = useState<string>('');
  const [merging, setMerging] = useState(false);

  // Find duplicate groups
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, MedicineWithBatches[]> = {};

    medicines.forEach((med) => {
      const normalized = normalizeText(med.name);
      if (!groups[normalized]) {
        groups[normalized] = [];
      }
      groups[normalized].push(med);
    });

    // Only return groups with more than one medicine
    return Object.entries(groups)
      .filter(([, meds]) => meds.length > 1)
      .map(([normalizedName, meds]) => ({
        normalizedName,
        medicines: meds,
      }));
  }, [medicines]);

  const totalDuplicates = duplicateGroups.reduce(
    (sum, g) => sum + g.medicines.length - 1,
    0
  );

  const handleSelectGroup = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    // Default to the one with most batches or earliest created
    const sorted = [...group.medicines].sort((a, b) => {
      const batchDiff = b.batches.length - a.batches.length;
      if (batchDiff !== 0) return batchDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    setPrimaryMedicineId(sorted[0].id);
  };

  const handleMerge = async () => {
    if (!selectedGroup || !primaryMedicineId) return;

    const duplicateIds = selectedGroup.medicines
      .filter((m) => m.id !== primaryMedicineId)
      .map((m) => m.id);

    if (duplicateIds.length === 0) {
      toast.error('No duplicates to merge');
      return;
    }

    setMerging(true);
    try {
      // 1. Update all medicine_batches to point to primary medicine
      const { error: batchError } = await supabase
        .from('medicine_batches')
        .update({ medicine_id: primaryMedicineId })
        .in('medicine_id', duplicateIds);

      if (batchError) throw batchError;

      // 2. Update sale_items references
      const { error: saleError } = await supabase
        .from('sale_items')
        .update({ medicine_id: primaryMedicineId })
        .in('medicine_id', duplicateIds);

      if (saleError) throw saleError;

      // 3. Update purchase_items references
      const { error: purchaseError } = await supabase
        .from('purchase_items')
        .update({ medicine_id: primaryMedicineId })
        .in('medicine_id', duplicateIds);

      if (purchaseError) throw purchaseError;

      // 4. Delete the duplicate medicines
      const { error: deleteError } = await supabase
        .from('medicines')
        .delete()
        .in('id', duplicateIds);

      if (deleteError) throw deleteError;

      toast.success(
        `Merged ${duplicateIds.length} duplicate(s) into "${selectedGroup.medicines.find((m) => m.id === primaryMedicineId)?.name}"`
      );

      setSelectedGroup(null);
      setPrimaryMedicineId('');
      onMergeComplete();

      // Check if there are more duplicates
      if (duplicateGroups.length <= 1) {
        setIsOpen(false);
      }
    } catch (error: unknown) {
      console.error('Error merging medicines:', error);
      const message = error instanceof Error ? error.message : 'Failed to merge medicines';
      toast.error(message);
    } finally {
      setMerging(false);
    }
  };

  const getTotalStock = (batches: MedicineBatch[]) => {
    return batches.reduce((sum, b) => sum + b.quantity, 0);
  };

  if (duplicateGroups.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GitMerge className="h-4 w-4" />
          Merge Duplicates
          <Badge variant="destructive" className="ml-1">
            {totalDuplicates}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge Duplicate Medicines
          </DialogTitle>
          <DialogDescription>
            Found {duplicateGroups.length} group(s) with duplicate medicine names.
            Select a group, choose which record to keep, and merge.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Left: List of duplicate groups */}
          <div className="w-1/3 border-r pr-4">
            <h3 className="font-medium mb-2 text-sm text-muted-foreground">
              Duplicate Groups
            </h3>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {duplicateGroups.map((group) => (
                  <button
                    key={group.normalizedName}
                    onClick={() => handleSelectGroup(group)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedGroup?.normalizedName === group.normalizedName
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium truncate">{group.normalizedName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {group.medicines.length} duplicates
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Selected group details */}
          <div className="flex-1 overflow-hidden">
            {selectedGroup ? (
              <>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">
                  Select Primary Record (others will be merged into this)
                </h3>
                <ScrollArea className="h-[350px]">
                  <RadioGroup
                    value={primaryMedicineId}
                    onValueChange={setPrimaryMedicineId}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Keep</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Batches</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroup.medicines.map((med) => (
                          <TableRow
                            key={med.id}
                            className={
                              primaryMedicineId === med.id ? 'bg-primary/5' : ''
                            }
                          >
                            <TableCell>
                              <RadioGroupItem value={med.id} id={med.id} />
                            </TableCell>
                            <TableCell>
                              <Label
                                htmlFor={med.id}
                                className="font-medium cursor-pointer"
                              >
                                {med.name}
                              </Label>
                              {med.generic_name && (
                                <div className="text-xs text-muted-foreground">
                                  {med.generic_name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{med.batches.length}</TableCell>
                            <TableCell>{getTotalStock(med.batches)}</TableCell>
                            <TableCell className="text-xs">
                              {new Date(med.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </RadioGroup>
                </ScrollArea>

                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <strong>This will:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>
                          Move all batches to "
                          {selectedGroup.medicines.find((m) => m.id === primaryMedicineId)
                            ?.name || 'selected'}
                          "
                        </li>
                        <li>Update all sales &amp; purchase history references</li>
                        <li>
                          Delete{' '}
                          {selectedGroup.medicines.length - 1} duplicate record(s)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedGroup(null);
                      setPrimaryMedicineId('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleMerge}
                    disabled={merging || !primaryMedicineId}
                    className="gap-2"
                  >
                    {merging ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Merging...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Merge Now
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a duplicate group to view details
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
