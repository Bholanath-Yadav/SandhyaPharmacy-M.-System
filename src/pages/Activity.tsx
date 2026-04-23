import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Loader2,
  Activity as ActivityIcon,
  Plus,
  Pencil,
  Trash2,
  Eye,
  LogIn,
  LogOut,
  Monitor,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  INSERT: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  UPDATE: { icon: Pencil, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  DELETE: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  SELECT: { icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  LOGIN: { icon: LogIn, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  LOGOUT: { icon: LogOut, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

const tableDisplayNames: Record<string, string> = {
  medicines: 'Medicine',
  medicine_batches: 'Medicine Batch',
  customers: 'Customer',
  suppliers: 'Supplier',
  sales_invoices: 'Sales Invoice',
  sale_items: 'Sale Item',
  purchases: 'Purchase',
  purchase_items: 'Purchase Item',
  payments: 'Payment',
  expenses: 'Expense',
  profiles: 'Profile',
  settings: 'Settings',
  pharmacy_profile: 'Pharmacy Profile',
  auth: 'Authentication',
};

export default function Activity() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Confirm dialogs
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as AuditLog, ...prev].slice(0, 500));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs((prev) => prev.filter((l) => l.id !== (payload.old as AuditLog).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('audit_logs').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete activity entry');
      return;
    }
    setLogs((prev) => prev.filter((l) => l.id !== id));
    toast.success('Activity entry deleted');
  };

  const handleClearAll = async () => {
    // Delete only the items currently visible after filters
    const ids = filteredLogs.map((l) => l.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from('audit_logs').delete().in('id', ids);
    if (error) {
      toast.error('Failed to clear activity');
      return;
    }
    setLogs((prev) => prev.filter((l) => !ids.includes(l.id)));
    toast.success(`Cleared ${ids.length} activity entries`);
    setConfirmClearAll(false);
  };

  const getActionDisplay = (action: string) => {
    const config = actionConfig[action] || actionConfig.SELECT;
    const Icon = config.icon;
    return (
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
    );
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      INSERT: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive',
      SELECT: 'outline',
    };
    return (
      <Badge variant={variants[action] || 'outline'} className="text-xs">
        {action}
      </Badge>
    );
  };

  const getDescription = (log: AuditLog) => {
    const tableName = tableDisplayNames[log.table_name] || log.table_name;
    const name =
      (log.new_values?.name as string) ||
      (log.old_values?.name as string) ||
      (log.new_values?.invoice_number as string) ||
      (log.old_values?.invoice_number as string) ||
      '';

    if (log.table_name === 'auth') {
      const email = (log.new_values?.email as string) || 'User';
      const platform = (log.new_values?.platform as string) || '';
      switch (log.action) {
        case 'LOGIN':
          return `${email} logged in${platform ? ` from ${platform}` : ''}`;
        case 'LOGOUT':
          return 'User logged out';
        default:
          return `Auth event: ${log.action}`;
      }
    }

    switch (log.action) {
      case 'INSERT':
        return `Created new ${tableName}${name ? `: ${name}` : ''}`;
      case 'UPDATE':
        return `Updated ${tableName}${name ? `: ${name}` : ''}`;
      case 'DELETE':
        return `Deleted ${tableName}${name ? `: ${name}` : ''}`;
      default:
        return `${log.action} on ${tableName}`;
    }
  };

  const getDeviceInfo = (log: AuditLog) => {
    if (log.table_name !== 'auth' || !log.new_values?.user_agent) return null;
    const ua = log.new_values.user_agent as string;
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Browser';
  };

  const tablesPresent = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.table_name));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    const term = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (tableFilter !== 'all' && log.table_name !== tableFilter) return false;

      const ts = new Date(log.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;

      if (term) {
        const desc = getDescription(log).toLowerCase();
        const tbl = (tableDisplayNames[log.table_name] || log.table_name).toLowerCase();
        if (!desc.includes(term) && !tbl.includes(term) && !log.action.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [logs, actionFilter, tableFilter, dateFrom, dateTo, searchTerm]);

  const hasActiveFilters =
    searchTerm || actionFilter !== 'all' || tableFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setTableFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Activity Log</h1>
          <p className="text-muted-foreground mt-1">Track real-time system activity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </div>
          {isAdmin && filteredLogs.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmClearAll(true)}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear {hasActiveFilters ? 'Filtered' : 'All'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {tablesPresent.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tableDisplayNames[t] || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs"
                title="From date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs"
                title="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Recent Activity
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ActivityIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{hasActiveFilters ? 'No matching activity' : 'No activity recorded yet'}</p>
              <p className="text-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Actions performed in the system will appear here'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {getActionDisplay(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground break-words">
                          {getDescription(log)}
                        </p>
                        {getActionBadge(log.action)}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span>{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                        {getDeviceInfo(log) && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="inline-flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              {getDeviceInfo(log)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteId(log.id)}
                        title="Delete this entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Single delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete activity entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this activity log entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) handleDelete(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirm */}
      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Clear {hasActiveFilters ? 'filtered' : 'all'} activity entries?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <strong>{filteredLogs.length}</strong>{' '}
              {filteredLogs.length === 1 ? 'entry' : 'entries'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearAll}
            >
              Delete {filteredLogs.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
