import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Sparkles,
  FileText,
  Package,
  Activity,
  UserCog,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', staffAccess: true },
  { icon: Sparkles, label: 'AI Assistant', href: '/ai-assistant', staffAccess: true },
  { icon: Pill, label: 'Medicines', href: '/medicines', staffAccess: true },
  { icon: ShoppingCart, label: 'Sales / POS', href: '/sales', staffAccess: true },
  { icon: FileText, label: 'Invoices', href: '/invoices', staffAccess: true },
  { icon: Users, label: 'Customers', href: '/customers', staffAccess: true },
  { icon: Truck, label: 'Suppliers', href: '/suppliers', staffAccess: false },
  { icon: Package, label: 'Purchases', href: '/purchases', staffAccess: false },
  { icon: BarChart3, label: 'Reports', href: '/reports', staffAccess: false },
  { icon: AlertTriangle, label: 'Expiry Alerts', href: '/expiry-alerts', staffAccess: true },
  { icon: Activity, label: 'Activity', href: '/activity', staffAccess: false },
  { icon: UserCog, label: 'Users', href: '/users', staffAccess: false },
  { icon: Settings, label: 'Settings', href: '/settings', staffAccess: false },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isAdmin, isStaff, userRole } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (isAdmin) return true;
    if (isStaff) return item.staffAccess;
    return true;
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'A';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground h-10 w-10 min-w-[40px]"
          >
            {sidebarOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Button>
          <div className="flex items-center gap-2 ml-3">
            <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-sidebar-primary" />
            <span className="font-bold text-sidebar-foreground text-sm sm:text-base truncate">Sandhya Pharmacy</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar transition-transform duration-300 lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
              <Pill className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">Sandhya</h1>
              <p className="text-xs text-sidebar-foreground/60">Pharmacy PMS</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation - Scrollable area */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User & Logout - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-3 mb-3 px-2">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Admin'} />
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-sm font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {userRole === 'main_admin' ? 'Main Admin' : userRole === 'admin' ? 'Administrator' : userRole === 'staff' ? 'Staff' : 'User'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-14 sm:pt-16 lg:pt-0 flex flex-col" style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}>
        <div className="p-3 sm:p-4 lg:p-8 flex-1">{children}</div>
        
        {/* Footer Credit */}
        <footer className="lg:ml-0 py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground border-t border-border">
          Designed and Developed by{' '}
          <a
            href="https://www.instagram.com/wordsayyysz?igsh=N2I4N3JubHYzMmpt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Prince
          </a>
        </footer>
      </main>
    </div>
  );
}
