import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  RotateCcw, 
  Shield, 
  Trash2, 
  Download,
  UserPlus,
  Building,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

type ResetMode = 'clean' | 'ownership_transfer';

interface NewOwnerDetails {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
}

interface PharmacyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string;
  pan_number: string;
}

export default function SystemReset() {
  const { isMainAdmin, signOut } = useAuth();
  const [resetMode, setResetMode] = useState<ResetMode>('clean');
  const [deleteAuditLogs, setDeleteAuditLogs] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [updatePharmacyDetails, setUpdatePharmacyDetails] = useState(false);
  
  const [pharmacyDetails, setPharmacyDetails] = useState<PharmacyDetails>({
    name: '',
    address: '',
    phone: '',
    email: '',
    vat_number: '',
    pan_number: '',
  });

  const [newOwner, setNewOwner] = useState<NewOwnerDetails>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });

  // Export data before reset
  const handleExportData = async (tableName: string) => {
    try {
      const { data, error } = await supabase.from(tableName as any).select('*');
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${tableName} data exported successfully`);
    } catch (error: any) {
      toast.error(`Failed to export ${tableName}: ${error.message}`);
    }
  };

  const handleExportAll = async () => {
    const tables = [
      'sales_invoices',
      'sale_items',
      'purchases',
      'purchase_items',
      'customers',
      'suppliers',
      'medicines',
      'medicine_batches',
      'payments',
      'expenses',
    ];

    for (const table of tables) {
      await handleExportData(table);
    }
    
    toast.success('All data exported successfully');
  };

  const validateForm = (): string | null => {
    if (resetMode === 'ownership_transfer') {
      if (!newOwner.email || !newOwner.password || !newOwner.full_name) {
        return 'Please fill in all new owner details';
      }
      if (newOwner.password !== newOwner.confirmPassword) {
        return 'New owner passwords do not match';
      }
      if (newOwner.password.length < 6) {
        return 'New owner password must be at least 6 characters';
      }
    }
    return null;
  };

  const handleStartReset = () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmReset = async () => {
    if (confirmText !== 'RESET SYSTEM') {
      toast.error('Please type RESET SYSTEM exactly to confirm');
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsResetting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const response = await supabase.functions.invoke('system-reset', {
        body: {
          mode: resetMode,
          password,
          confirmText,
          deleteAuditLogs,
          newPharmacyDetails: updatePharmacyDetails ? pharmacyDetails : undefined,
          newOwner: resetMode === 'ownership_transfer' ? {
            email: newOwner.email,
            password: newOwner.password,
            full_name: newOwner.full_name,
          } : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Reset failed');
      }

      setResetComplete(true);
      setShowConfirmDialog(false);
      toast.success(response.data.message);

      // If ownership transfer, sign out the current user
      if (resetMode === 'ownership_transfer') {
        setTimeout(() => {
          signOut();
        }, 3000);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset system';
      toast.error(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isMainAdmin) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Access Denied</h3>
              <p className="text-sm text-muted-foreground">
                Only Main Admin can access the System Reset feature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (resetComplete) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-600 mb-2">System Reset Complete</h2>
          <p className="text-muted-foreground mb-4">
            {resetMode === 'clean' 
              ? 'The system has been reset. Your account and settings are preserved.'
              : 'Ownership transfer complete. You will be signed out shortly.'}
          </p>
          {resetMode === 'clean' && (
            <Button onClick={() => window.location.reload()}>
              Continue to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            System Reset / Factory Reset
          </CardTitle>
          <CardDescription>
            Reset the pharmacy system for resale or ownership transfer. This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning: Destructive Action</AlertTitle>
            <AlertDescription>
              This will permanently delete all business data including sales, purchases, customers, 
              suppliers, and inventory. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Pre-Reset Backup */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="h-4 w-4" />
              Pre-Reset Backup (Recommended)
            </h3>
            <p className="text-sm text-muted-foreground">
              Export your data before resetting. Once reset is completed, data cannot be recovered.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExportData('sales_invoices')}>
                Export Sales
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportData('purchases')}>
                Export Purchases
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportData('customers')}>
                Export Customers
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportData('suppliers')}>
                Export Suppliers
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportData('medicines')}>
                Export Medicines
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportAll}>
                <Download className="mr-2 h-4 w-4" />
                Export All Data
              </Button>
            </div>
          </div>

          <Separator />

          {/* Reset Mode Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Select Reset Mode
            </h3>
            <RadioGroup value={resetMode} onValueChange={(v) => setResetMode(v as ResetMode)}>
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                <RadioGroupItem value="clean" id="clean" />
                <div className="space-y-1">
                  <Label htmlFor="clean" className="font-medium text-green-600 cursor-pointer">
                    Clean Reset (Recommended)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Deletes all business data but keeps your Main Admin account and system configuration. 
                    You can optionally update pharmacy details.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <RadioGroupItem value="ownership_transfer" id="ownership" />
                <div className="space-y-1">
                  <Label htmlFor="ownership" className="font-medium text-blue-600 cursor-pointer">
                    Ownership Transfer Reset
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Deletes all business data AND all users. Creates a fresh Main Admin account 
                    for the new pharmacy owner.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* New Owner Details (for ownership transfer) */}
          {resetMode === 'ownership_transfer' && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                New Owner Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newOwnerName">Full Name *</Label>
                  <Input
                    id="newOwnerName"
                    value={newOwner.full_name}
                    onChange={(e) => setNewOwner({ ...newOwner, full_name: e.target.value })}
                    placeholder="New owner's full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newOwnerEmail">Email *</Label>
                  <Input
                    id="newOwnerEmail"
                    type="email"
                    value={newOwner.email}
                    onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                    placeholder="newowner@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newOwnerPassword">Password *</Label>
                  <Input
                    id="newOwnerPassword"
                    type="password"
                    value={newOwner.password}
                    onChange={(e) => setNewOwner({ ...newOwner, password: e.target.value })}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newOwnerConfirmPassword">Confirm Password *</Label>
                  <Input
                    id="newOwnerConfirmPassword"
                    type="password"
                    value={newOwner.confirmPassword}
                    onChange={(e) => setNewOwner({ ...newOwner, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Update Pharmacy Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="updatePharmacy"
                checked={updatePharmacyDetails}
                onCheckedChange={(checked) => setUpdatePharmacyDetails(checked as boolean)}
              />
              <Label htmlFor="updatePharmacy" className="cursor-pointer">
                Update pharmacy details after reset
              </Label>
            </div>

            {updatePharmacyDetails && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
                <h4 className="font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  New Pharmacy Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                    <Input
                      id="pharmacyName"
                      value={pharmacyDetails.name}
                      onChange={(e) => setPharmacyDetails({ ...pharmacyDetails, name: e.target.value })}
                      placeholder="New pharmacy name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacyPhone">Phone</Label>
                    <Input
                      id="pharmacyPhone"
                      value={pharmacyDetails.phone}
                      onChange={(e) => setPharmacyDetails({ ...pharmacyDetails, phone: e.target.value })}
                      placeholder="+977-XX-XXXXXXX"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pharmacyAddress">Address</Label>
                    <Input
                      id="pharmacyAddress"
                      value={pharmacyDetails.address}
                      onChange={(e) => setPharmacyDetails({ ...pharmacyDetails, address: e.target.value })}
                      placeholder="Street, City, District"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacyEmail">Email</Label>
                    <Input
                      id="pharmacyEmail"
                      type="email"
                      value={pharmacyDetails.email}
                      onChange={(e) => setPharmacyDetails({ ...pharmacyDetails, email: e.target.value })}
                      placeholder="pharmacy@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacyPan">PAN Number</Label>
                    <Input
                      id="pharmacyPan"
                      value={pharmacyDetails.pan_number}
                      onChange={(e) => setPharmacyDetails({ ...pharmacyDetails, pan_number: e.target.value })}
                      placeholder="PAN Number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacyVat">VAT Number</Label>
                    <Input
                      id="pharmacyVat"
                      value={pharmacyDetails.vat_number}
                      onChange={(e) => setPharmacyDetails({ ...pharmacyDetails, vat_number: e.target.value })}
                      placeholder="VAT Number"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Audit Logs Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="deleteAudit"
              checked={deleteAuditLogs}
              onCheckedChange={(checked) => setDeleteAuditLogs(checked as boolean)}
            />
            <Label htmlFor="deleteAudit" className="cursor-pointer">
              Also delete audit logs (keeps reset action log)
            </Label>
          </div>

          {/* Data to be Deleted Info */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Data to be Permanently Deleted:
            </h4>
            <ul className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-3 gap-1">
              <li>• Sales & Invoices</li>
              <li>• Sale Items</li>
              <li>• Purchases</li>
              <li>• Purchase Items</li>
              <li>• Payments</li>
              <li>• Customers</li>
              <li>• Suppliers</li>
              <li>• Medicines</li>
              <li>• Medicine Batches</li>
              <li>• Expenses</li>
              <li>• Ledger Entries</li>
              {deleteAuditLogs && <li>• Audit Logs</li>}
              {resetMode === 'ownership_transfer' && <li>• All Users</li>}
            </ul>
          </div>

          {/* Reset Button */}
          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full"
            onClick={handleStartReset}
          >
            <Shield className="mr-2 h-5 w-5" />
            {resetMode === 'clean' ? 'Start Clean Reset' : 'Start Ownership Transfer'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm System Reset
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. All selected data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Enter Your Password *</Label>
              <Input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your admin password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmReset">
                Type <span className="font-mono font-bold text-destructive">RESET SYSTEM</span> to confirm
              </Label>
              <Input
                id="confirmReset"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET SYSTEM"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmReset}
              disabled={isResetting || confirmText !== 'RESET SYSTEM' || !password}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Confirm Reset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
