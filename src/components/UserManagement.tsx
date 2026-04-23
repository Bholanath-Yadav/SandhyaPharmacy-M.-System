import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Users, 
  Trash2, 
  Shield, 
  ShieldCheck, 
  Loader2, 
  Crown, 
  Search, 
  Pencil,
  Ban,
  CheckCircle,
  MoreHorizontal,
  AlertTriangle,
  ShieldOff
} from 'lucide-react';
import { z } from 'zod';

interface UserWithRole {
  id: string;
  email: string | null;
  role: 'main_admin' | 'admin' | 'staff' | null;
  full_name: string | null;
  created_at: string;
  is_banned: boolean;
  banned_at: string | null;
}

const createUserSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  full_name: z.string().trim().min(1, { message: "Full name is required" }).max(100),
  role: z.enum(['admin', 'staff']),
});

const editUserSchema = z.object({
  full_name: z.string().trim().min(1, { message: "Full name is required" }).max(100),
});

export default function UserManagement() {
  const { isMainAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banning, setBanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [userToBan, setUserToBan] = useState<UserWithRole | null>(null);
  const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [editFormData, setEditFormData] = useState({ full_name: '' });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff' as 'admin' | 'staff',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch ALL profiles (including users without roles)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, is_banned, banned_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profilesData || []).map(profile => {
        const roleData = rolesData?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: (profile as any).email || null,
          role: roleData ? (roleData.role as 'main_admin' | 'admin' | 'staff') : null,
          full_name: profile.full_name,
          created_at: roleData?.created_at || profile.created_at,
          is_banned: profile.is_banned || false,
          banned_at: profile.banned_at || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const validation = createUserSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setCreating(true);
    try {
      // Store the current session before creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Wait a moment for profile trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Insert the user role since auto-assign is disabled
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: formData.role });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        toast.error('User created but role assignment failed. Please assign role manually.');
      }

      // Restore the original admin session if it was changed
      if (currentSession?.session && authData.session) {
        // The signUp switched to new user, switch back to admin
        await supabase.auth.setSession({
          access_token: currentSession.session.access_token,
          refresh_token: currentSession.session.refresh_token,
        });
      }

      // Log the user creation
      await supabase.from('audit_logs').insert({
        action: 'USER_CREATED',
        table_name: 'users',
        record_id: authData.user.id,
        user_id: currentUser?.id,
        new_values: { email: formData.email, role: formData.role, full_name: formData.full_name },
      });

      toast.success(`User ${formData.email} created successfully`);
      setIsDialogOpen(false);
      resetForm();
      
      // Fetch users after a small delay to ensure data is available
      setTimeout(() => {
        fetchUsers();
      }, 300);
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already registered')) {
        toast.error('This email is already registered');
      } else {
        toast.error(error.message || 'Failed to create user');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleBanUser = async () => {
    if (!userToBan || !isMainAdmin) return;
    
    setBanning(true);
    try {
      const isBanning = banAction === 'ban';
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: isBanning,
          banned_at: isBanning ? new Date().toISOString() : null,
          banned_by: isBanning ? currentUser?.id : null,
        })
        .eq('id', userToBan.id);

      if (error) throw error;

      // Log the ban/unban action
      await supabase.from('audit_logs').insert({
        action: isBanning ? 'USER_BANNED' : 'USER_UNBANNED',
        table_name: 'users',
        record_id: userToBan.id,
        user_id: currentUser?.id,
        old_values: { is_banned: !isBanning },
        new_values: { is_banned: isBanning, email: userToBan.email },
      });

      toast.success(isBanning ? 'User has been banned' : 'User has been unbanned');
      setIsBanDialogOpen(false);
      setUserToBan(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast.error(error.message || 'Failed to update user ban status');
    } finally {
      setBanning(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!userToDelete || !isMainAdmin || !deletePassword) return;
    
    setDeletePasswordError('');
    setDeleting(true);
    
    try {
      // Verify admin's password by attempting to sign in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser?.email || '',
        password: deletePassword,
      });

      if (authError) {
        setDeletePasswordError('Incorrect password. Please try again.');
        setDeleting(false);
        return;
      }

      // Log the deletion BEFORE deleting (to capture user info)
      await supabase.from('audit_logs').insert({
        action: 'USER_PERMANENTLY_DELETED',
        table_name: 'users',
        record_id: userToDelete.id,
        user_id: currentUser?.id,
        old_values: { 
          email: userToDelete.email, 
          full_name: userToDelete.full_name,
          role: userToDelete.role,
        },
      });

      // Delete user role first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      // Delete profile (this should cascade delete related data)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (deleteError) throw deleteError;

      toast.success('User permanently deleted');
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeletePassword('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!isMainAdmin) {
      toast.error('Only Main Admin can remove roles');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'USER_ROLE_REMOVED',
        table_name: 'user_roles',
        record_id: userId,
        user_id: currentUser?.id,
      });

      toast.success('Role removed - user now has no access');
      fetchUsers();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error(error.message || 'Failed to remove role');
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: string | null, newRole: 'admin' | 'staff' | 'no_role') => {
    if (!isMainAdmin) {
      toast.error('Only Main Admin can change roles');
      return;
    }

    if (currentRole === 'main_admin') {
      toast.error('Cannot change Main Admin role');
      return;
    }

    try {
      if (newRole === 'no_role') {
        await handleRemoveRole(userId);
        return;
      }

      if (currentRole === null) {
        // User has no role yet, insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
        
        // Log the action
        await supabase.from('audit_logs').insert({
          action: 'USER_ROLE_ASSIGNED',
          table_name: 'user_roles',
          record_id: userId,
          user_id: currentUser?.id,
          new_values: { role: newRole },
        });
        
        toast.success(`Role assigned: ${newRole}`);
      } else {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
        
        // Log the action
        await supabase.from('audit_logs').insert({
          action: 'USER_ROLE_CHANGED',
          table_name: 'user_roles',
          record_id: userId,
          user_id: currentUser?.id,
          old_values: { role: currentRole },
          new_values: { role: newRole },
        });
        
        toast.success(`Role updated to ${newRole}`);
      }
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'staff',
    });
    setErrors({});
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setEditFormData({ full_name: user.full_name || '' });
    setEditErrors({});
    setIsEditDialogOpen(true);
  };

  const openBanDialog = (user: UserWithRole, action: 'ban' | 'unban') => {
    setUserToBan(user);
    setBanAction(action);
    setIsBanDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setUserToDelete(user);
    setDeletePassword('');
    setDeletePasswordError('');
    setIsDeleteDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setEditErrors({});

    const validation = editUserSchema.safeParse(editFormData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setEditErrors(fieldErrors);
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editFormData.full_name })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const nameMatch = user.full_name?.toLowerCase().includes(query) || false;
    const emailMatch = user.email?.toLowerCase().includes(query) || false;
    return nameMatch || emailMatch;
  });

  const getRoleBadge = (role: string | null) => {
    if (role === 'main_admin') {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
          <Crown className="h-3 w-3 mr-1" />
          Main Admin
        </Badge>
      );
    }
    if (role === 'admin') {
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    if (role === 'staff') {
      return (
        <Badge variant="secondary">
          <Shield className="h-3 w-3 mr-1" />
          Staff
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground border-dashed">
        <ShieldOff className="h-3 w-3 mr-1" />
        No Role
      </Badge>
    );
  };

  const getStatusBadge = (user: UserWithRole) => {
    if (user.is_banned) {
      return (
        <Badge variant="destructive" className="ml-2">
          <Ban className="h-3 w-3 mr-1" />
          Banned
        </Badge>
      );
    }
    return null;
  };

  const canModifyUser = (user: UserWithRole) => {
    if (user.role === 'main_admin') return false;
    if (user.id === currentUser?.id) return false;
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage staff accounts and permissions
              {isMainAdmin && (
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-500/30">
                  <Crown className="h-3 w-3 mr-1" />
                  Main Admin Access
                </Badge>
              )}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter full name"
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'staff') => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Staff - Limited access
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          Admin - Full access
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role}</p>
                  )}
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Role Permissions:</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li><strong>Staff:</strong> View medicines, full access to Sales/POS & Customers</li>
                    <li><strong>Admin:</strong> Full access to all features except user management</li>
                    <li><strong>Main Admin:</strong> Full access including user management, ban, delete</li>
                  </ul>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No users found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Add your first user
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No users match your search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={user.is_banned ? 'opacity-60' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || 'No name set'}</p>
                        <p className="text-sm text-muted-foreground">{user.email || 'No email'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'main_admin' || !isMainAdmin ? (
                        getRoleBadge(user.role)
                      ) : (
                        <Select
                          value={user.role || 'no_role'}
                          onValueChange={(value: 'admin' | 'staff' | 'no_role') => handleUpdateRole(user.id, user.role, value)}
                          disabled={user.id === currentUser?.id}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue>
                              {getRoleBadge(user.role)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_role">
                              <div className="flex items-center gap-2">
                                <ShieldOff className="h-4 w-4" />
                                No Role
                              </div>
                            </SelectItem>
                            <SelectItem value="staff">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Staff
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_banned ? (
                        <Badge variant="destructive">
                          <Ban className="h-3 w-3 mr-1" />
                          Banned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role === 'main_admin' ? (
                        <span className="text-muted-foreground text-xs">Protected</span>
                      ) : isMainAdmin && canModifyUser(user) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            {user.is_banned ? (
                              <DropdownMenuItem onClick={() => openBanDialog(user, 'unban')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => openBanDialog(user, 'ban')}
                                className="text-amber-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Permanently Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {user.id === currentUser?.id ? 'You' : 'View Only'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingUser(null);
            setEditErrors({});
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editingUser?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input
                  id="edit_full_name"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
                {editErrors.full_name && (
                  <p className="text-sm text-destructive">{editErrors.full_name}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Ban/Unban Confirmation Dialog */}
        <AlertDialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {banAction === 'ban' ? (
                  <>
                    <Ban className="h-5 w-5 text-amber-500" />
                    Ban User
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Unban User
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {banAction === 'ban' ? (
                  <>
                    Are you sure you want to ban <strong>{userToBan?.full_name || userToBan?.email}</strong>?
                    <br /><br />
                    <span className="text-muted-foreground">
                      • The user will not be able to log in<br />
                      • User data will remain in the system<br />
                      • You can unban them anytime
                    </span>
                  </>
                ) : (
                  <>
                    Are you sure you want to unban <strong>{userToBan?.full_name || userToBan?.email}</strong>?
                    <br /><br />
                    <span className="text-muted-foreground">
                      The user will be able to log in again with their existing role.
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBanUser}
                disabled={banning}
                className={banAction === 'ban' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}
              >
                {banning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : banAction === 'ban' ? (
                  'Ban User'
                ) : (
                  'Unban User'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanent Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setUserToDelete(null);
            setDeletePassword('');
            setDeletePasswordError('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Permanently Delete User
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. The user <strong>{userToDelete?.full_name || userToDelete?.email}</strong> will be completely removed from the system.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
                <p className="font-medium text-destructive mb-2">Warning: This will permanently delete:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• User profile and account</li>
                  <li>• All user permissions and roles</li>
                  <li>• This action is logged in audit logs</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delete_password">Enter your password to confirm</Label>
                <Input
                  id="delete_password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your admin password"
                />
                {deletePasswordError && (
                  <p className="text-sm text-destructive">{deletePasswordError}</p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handlePermanentDelete}
                disabled={deleting || !deletePassword}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Permanently Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
