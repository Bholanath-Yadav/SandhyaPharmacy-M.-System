import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Building,
  Save,
  Settings as SettingsIcon,
  Receipt,
  Percent,
  User,
  Mail,
  Upload,
  Loader2,
  Image as ImageIcon,
  Hash,
  Banknote,
  X,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import SystemReset from '@/components/SystemReset';

type PharmacyProfile = Tables<'pharmacy_profile'>;

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const cleanString = (raw: unknown, fallback: string) => {
  if (raw === null || raw === undefined) return fallback;
  return String(raw).replace(/^"|"$/g, '').trim() || fallback;
};

export default function Settings() {
  const { user, isMainAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPharmacy, setSavingPharmacy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    pan_number: '',
    vat_number: '',
    logo_url: '',
  });
  const [userFormData, setUserFormData] = useState({ full_name: '', avatar_url: '' });

  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [purchasePrefix, setPurchasePrefix] = useState('PUR');
  const [vatRate, setVatRate] = useState('13');
  const [currency, setCurrency] = useState('NPR');

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data: profileData } = await supabase
        .from('pharmacy_profile')
        .select('*')
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          address: profileData.address || '',
          phone: profileData.phone || '',
          email: profileData.email || '',
          pan_number: profileData.pan_number || '',
          vat_number: profileData.vat_number || '',
          logo_url: profileData.logo_url || '',
        });
      }

      if (user) {
        const { data: userProfileData } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (userProfileData) {
          setUserProfile(userProfileData as UserProfile);
          setUserFormData({
            full_name: userProfileData.full_name || '',
            avatar_url: userProfileData.avatar_url || '',
          });
        }
      }

      const { data: settingsRows } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['invoice_prefix', 'purchase_prefix', 'vat_rate', 'currency']);

      const map = new Map<string, unknown>();
      (settingsRows || []).forEach((r) => map.set(r.key, r.value));

      setInvoicePrefix(cleanString(map.get('invoice_prefix'), 'INV'));
      setPurchasePrefix(cleanString(map.get('purchase_prefix'), 'PUR'));
      setVatRate(cleanString(map.get('vat_rate'), '13'));
      setCurrency(cleanString(map.get('currency'), 'NPR'));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      if (userProfile) {
        await (supabase as any)
          .from('profiles')
          .update({ avatar_url: avatarUrlWithTimestamp })
          .eq('id', user.id);
      } else {
        await (supabase as any)
          .from('profiles')
          .insert({ id: user.id, avatar_url: avatarUrlWithTimestamp });
      }

      setUserFormData((prev) => ({ ...prev, avatar_url: avatarUrlWithTimestamp }));
      toast.success('Avatar uploaded');
      fetchSettings();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/pharmacy_logo.${fileExt}`;

    setUploadingLogo(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const logoUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setFormData((prev) => ({ ...prev, logo_url: logoUrlWithTimestamp }));
      toast.success('Logo uploaded — remember to save the pharmacy profile');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: '' }));
  };

  const handleSaveUserProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      if (userProfile) {
        const { error } = await (supabase as any)
          .from('profiles')
          .update({
            full_name: userFormData.full_name,
            avatar_url: userFormData.avatar_url,
          })
          .eq('id', user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('profiles')
          .insert({
            id: user.id,
            full_name: userFormData.full_name,
            avatar_url: userFormData.avatar_url,
          });
        if (error) throw error;
      }
      toast.success('Profile saved');
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving user profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePharmacy = async () => {
    if (!formData.name.trim()) {
      toast.error('Pharmacy name is required');
      return;
    }
    setSavingPharmacy(true);
    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        pan_number: formData.pan_number || null,
        vat_number: formData.vat_number || null,
        logo_url: formData.logo_url || null,
      };
      if (profile) {
        const { error } = await supabase
          .from('pharmacy_profile')
          .update(payload)
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pharmacy_profile').insert(payload);
        if (error) throw error;
      }
      toast.success('Pharmacy profile saved');
      queryClient.invalidateQueries({ queryKey: ['pharmacy-profile'] });
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSavingPharmacy(false);
    }
  };

  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  };

  const handleSaveSettings = async () => {
    const vatNum = parseFloat(vatRate);
    if (!Number.isFinite(vatNum) || vatNum < 0 || vatNum > 100) {
      toast.error('VAT rate must be between 0 and 100');
      return;
    }
    if (!invoicePrefix.trim()) {
      toast.error('Invoice prefix is required');
      return;
    }
    if (!purchasePrefix.trim()) {
      toast.error('Purchase prefix is required');
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting('invoice_prefix', invoicePrefix.trim().toUpperCase()),
        upsertSetting('purchase_prefix', purchasePrefix.trim().toUpperCase()),
        upsertSetting('vat_rate', String(vatNum)),
        upsertSetting('currency', currency.trim().toUpperCase() || 'NPR'),
      ]);
      toast.success('System settings saved — new invoices will use the updated values');
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const sampleInvoiceNumber = `${invoicePrefix.toUpperCase() || 'INV'}-000001`;
  const samplePurchaseNumber = `${purchasePrefix.toUpperCase() || 'PUR'}-000001`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your account, pharmacy, and how the software behaves
        </p>
      </div>

      <Tabs defaultValue="pharmacy" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="pharmacy">
            <Building className="h-4 w-4 mr-2" />
            Pharmacy
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="account">
            <User className="h-4 w-4 mr-2" />
            My Account
          </TabsTrigger>
        </TabsList>

        {/* PHARMACY TAB */}
        <TabsContent value="pharmacy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo + Live Preview */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Pharmacy Logo
                </CardTitle>
                <CardDescription>
                  Shown on invoice headers and PDF documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg bg-muted/30">
                  <div className="w-32 h-32 rounded-lg bg-white border flex items-center justify-center overflow-hidden">
                    {formData.logo_url ? (
                      <img
                        src={formData.logo_url}
                        alt="Pharmacy logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {formData.logo_url ? 'Replace' : 'Upload Logo'}
                    </label>
                    {formData.logo_url && (
                      <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                        <X className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    PNG / JPG recommended. Square images look best.
                  </p>
                </div>

                {/* Live header preview */}
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Invoice Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Building className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{formData.name || 'Pharmacy Name'}</p>
                      {formData.address && (
                        <p className="text-xs text-muted-foreground truncate">{formData.address}</p>
                      )}
                      {formData.phone && (
                        <p className="text-xs text-muted-foreground">📞 {formData.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pharmacy Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Pharmacy Details
                </CardTitle>
                <CardDescription>
                  These details appear on invoices, purchase records, reports, and PDFs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Pharmacy Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Sandhya Pharmacy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street, City, District"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+977-XX-XXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="pharmacy@email.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input
                      id="pan_number"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                      placeholder="PAN Number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vat_number">VAT Number</Label>
                    <Input
                      id="vat_number"
                      value={formData.vat_number}
                      onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                      placeholder="VAT Number"
                    />
                  </div>
                </div>
                <Button onClick={handleSavePharmacy} disabled={savingPharmacy} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {savingPharmacy ? 'Saving...' : 'Save Pharmacy Profile'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SYSTEM TAB */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                These values affect every new sales invoice and purchase record going forward
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoice prefix */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-accent/10">
                      <Receipt className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <Label htmlFor="invoice_prefix" className="text-base">
                        Invoice Prefix
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Used for new sales invoice numbers
                      </p>
                    </div>
                  </div>
                  <Input
                    id="invoice_prefix"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                    placeholder="INV"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Next invoice will look like: <span className="font-mono font-medium text-foreground">{sampleInvoiceNumber}</span>
                  </p>
                </div>

                {/* Purchase prefix */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10">
                      <Hash className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <Label htmlFor="purchase_prefix" className="text-base">
                        Purchase Prefix
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Used for new purchase record numbers
                      </p>
                    </div>
                  </div>
                  <Input
                    id="purchase_prefix"
                    value={purchasePrefix}
                    onChange={(e) => setPurchasePrefix(e.target.value.toUpperCase())}
                    placeholder="PUR"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Next purchase will look like: <span className="font-mono font-medium text-foreground">{samplePurchaseNumber}</span>
                  </p>
                </div>

                {/* VAT rate */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-500/10">
                      <Percent className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <Label htmlFor="vat_rate" className="text-base">
                        VAT Rate (%)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Applied to sales and purchases (Nepal default: 13%)
                      </p>
                    </div>
                  </div>
                  <Input
                    id="vat_rate"
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    placeholder="13"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    On NPR 1,000: VAT ={' '}
                    <span className="font-mono font-medium text-foreground">
                      NPR {((parseFloat(vatRate) || 0) * 10).toFixed(2)}
                    </span>
                  </p>
                </div>

                {/* Currency */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-green-500/10">
                      <Banknote className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-base">
                        Currency Code
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Used as the label across the system (e.g. NPR)
                      </p>
                    </div>
                  </div>
                  <Input
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    placeholder="NPR"
                    maxLength={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed as: <span className="font-mono font-medium text-foreground">{currency || 'NPR'} 1,234.56</span>
                  </p>
                </div>
              </div>

              <Separator />

              <Button onClick={handleSaveSettings} disabled={saving} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save System Settings'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Changes apply immediately to new transactions. Existing records keep the values they were created with.
              </p>
            </CardContent>
          </Card>

          {/* Read-only system info */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">1.0.0</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Currency</p>
                  <p className="font-medium">{currency || 'NPR'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">VAT Registration</p>
                  <p className="font-medium">{formData.vat_number || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax Compliance</p>
                  <p className="font-medium">Nepal IRD</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isMainAdmin && <SystemReset />}
        </TabsContent>

        {/* ACCOUNT TAB */}
        <TabsContent value="account">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                My Profile
              </CardTitle>
              <CardDescription>Your personal account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={userFormData.avatar_url} alt={userFormData.full_name || 'User'} />
                    <AvatarFallback className="text-lg">
                      {getInitials(userFormData.full_name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{userFormData.full_name || 'Set your name'}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user?.email}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <Button onClick={handleSaveUserProfile} disabled={savingProfile} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
