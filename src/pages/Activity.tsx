import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Activity as ActivityIcon, Plus, Pencil, Trash2, Eye, LogIn, LogOut, Monitor } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
  INSERT: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100' },
  UPDATE: { icon: Pencil, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  DELETE: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100' },
  SELECT: { icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  LOGIN: { icon: LogIn, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  LOGOUT: { icon: LogOut, color: 'text-orange-600', bgColor: 'bg-orange-100' },
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {
          setLogs((prev) => [payload.new as AuditLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    const name = log.new_values?.name || log.old_values?.name || log.new_values?.invoice_number || log.old_values?.invoice_number || '';
    
    // Handle auth events
    if (log.table_name === 'auth') {
      const email = log.new_values?.email as string || 'User';
      const platform = log.new_values?.platform as string || '';
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
    
    // Simple browser detection
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Browser';
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ActivityIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity recorded yet</p>
              <p className="text-sm">Actions performed in the system will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {logs.map((log, index) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {getActionDisplay(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{getDescription(log)}</p>
                        {getActionBadge(log.action)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                        {getDeviceInfo(log) && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              {getDeviceInfo(log)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
