import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Building, Save, Settings as SettingsIcon, Receipt, Percent, User, Mail, Upload, Loader2 } from 'lucide-react';
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

export default function Settings() {
  const { user, isMainAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    pan_number: '',
    vat_number: '',
  });
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    avatar_url: '',
  });
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [vatRate, setVatRate] = useState('13');

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      // Fetch pharmacy profile
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
        });
      }

      // Fetch user profile if logged in
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

      // Fetch invoice prefix
      const { data: prefixData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'invoice_prefix')
        .maybeSingle();

      if (prefixData?.value) {
        setInvoicePrefix(String(prefixData.value).replace(/"/g, ''));
      }

      // Fetch VAT rate
      const { data: vatData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'vat_rate')
        .maybeSingle();

      if (vatData?.value) {
        setVatRate(String(vatData.value).replace(/"/g, ''));
      }
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
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update profile with new avatar URL
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
      
      setUserFormData(prev => ({ ...prev, avatar_url: avatarUrlWithTimestamp }));
      toast.success('Avatar uploaded successfully');
      fetchSettings();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
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
      toast.success('Profile saved successfully');
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving user profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (profile) {
        const { error } = await supabase
          .from('pharmacy_profile')
          .update(formData)
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pharmacy_profile')
          .insert(formData);
        if (error) throw error;
      }
      toast.success('Pharmacy profile saved successfully');
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save invoice prefix
      const { data: existingPrefix } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'invoice_prefix')
        .maybeSingle();

      if (existingPrefix) {
        await supabase
          .from('settings')
          .update({ value: invoicePrefix })
          .eq('key', 'invoice_prefix');
      } else {
        await supabase
          .from('settings')
          .insert({ key: 'invoice_prefix', value: invoicePrefix });
      }

      // Save VAT rate
      const { data: existingVat } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'vat_rate')
        .maybeSingle();

      if (existingVat) {
        await supabase
          .from('settings')
          .update({ value: vatRate })
          .eq('key', 'vat_rate');
      } else {
        await supabase
          .from('settings')
          .insert({ key: 'vat_rate', value: vatRate });
      }

      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your pharmacy system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
            <CardDescription>
              Your personal account settings and preferences
            </CardDescription>
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

        {/* Pharmacy Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Pharmacy Profile
            </CardTitle>
            <CardDescription>
              Your pharmacy's business information for invoices and documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pharmacy Name</Label>
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure invoice numbering and tax settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Receipt className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                  <p className="text-sm text-muted-foreground">Prefix for invoice numbers (e.g., INV-000001)</p>
                </div>
              </div>
              <Input
                id="invoice_prefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="INV"
                maxLength={5}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-pharmacy-warning/10">
                  <Percent className="h-5 w-5 text-pharmacy-warning" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="vat_rate">VAT Rate (%)</Label>
                  <p className="text-sm text-muted-foreground">Nepal VAT rate (default: 13%)</p>
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
              />
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
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
              <p className="font-medium">NPR (Nepalese Rupee)</p>
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

      {/* System Reset - Only visible to Main Admin */}
      {isMainAdmin && (
        <SystemReset />
      )}
    </div>
  );
}
