import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight,
} from 'lucide-react';

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  staffAccess: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/', staffAccess: true },
      { icon: Sparkles, label: 'AI Assistant', href: '/ai-assistant', staffAccess: true },
    ],
  },
  {
    title: 'Sales',
    items: [
      { icon: ShoppingCart, label: 'Sales / POS', href: '/sales', staffAccess: true },
      { icon: FileText, label: 'Invoices', href: '/invoices', staffAccess: true },
      { icon: Users, label: 'Customers', href: '/customers', staffAccess: true },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { icon: Pill, label: 'Medicines', href: '/medicines', staffAccess: true },
      { icon: AlertTriangle, label: 'Expiry Alerts', href: '/expiry-alerts', staffAccess: true },
      { icon: Package, label: 'Purchases', href: '/purchases', staffAccess: false },
      { icon: Truck, label: 'Suppliers', href: '/suppliers', staffAccess: false },
    ],
  },
  {
    title: 'Insights',
    items: [
      { icon: BarChart3, label: 'Reports', href: '/reports', staffAccess: false },
      { icon: Activity, label: 'Activity', href: '/activity', staffAccess: false },
    ],
  },
  {
    title: 'Administration',
    items: [
      { icon: UserCog, label: 'Users', href: '/users', staffAccess: false },
      { icon: Settings, label: 'Settings', href: '/settings', staffAccess: false },
    ],
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const roleLabel = (role: string | null) => {
  switch (role) {
    case 'main_admin':
      return 'Main Admin';
    case 'admin':
      return 'Administrator';
    case 'staff':
      return 'Staff';
    default:
      return 'User';
  }
};

const roleBadgeStyle = (role: string | null) => {
  switch (role) {
    case 'main_admin':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'admin':
      return 'bg-sidebar-primary/15 text-sidebar-primary border-sidebar-primary/30';
    case 'staff':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    default:
      return 'bg-sidebar-accent text-sidebar-foreground/70 border-sidebar-border';
  }
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isAdmin, isStaff, userRole } = useAuth();

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (isAdmin) return true;
        if (isStaff) return item.staffAccess;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
      return profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'A';
  };

  const currentItem = filteredSections
    .flatMap((s) => s.items)
    .find((item) => item.href === location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 shadow-sm"
        style={{ paddingTop: 'var(--safe-area-inset-top)' }}
      >
        <div className="flex items-center min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground h-10 w-10 min-w-[40px] hover:bg-sidebar-accent"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2 ml-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
              <Pill className="h-4 w-4 text-sidebar-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sidebar-foreground text-sm truncate leading-tight">
                {currentItem?.label || 'Sandhya Pharmacy'}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 leading-tight truncate">
                Pharmacy PMS
              </p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col shadow-xl lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-3 group"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary/30 to-sidebar-primary/10 flex items-center justify-center ring-1 ring-sidebar-primary/20 group-hover:ring-sidebar-primary/40 transition-all">
              <Pill className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground leading-tight tracking-tight">
                Sandhya
              </h1>
              <p className="text-[11px] text-sidebar-foreground/50 leading-tight">
                Pharmacy PMS
              </p>
            </div>
          </Link>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
          {filteredSections.map((section, idx) => (
            <div key={section.title} className={cn('space-y-0.5', idx > 0 && 'mt-5')}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'active:scale-[0.98]',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                    )}
                  >
                    {/* Active accent bar */}
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-sidebar-primary transition-all',
                        isActive ? 'h-7 opacity-100' : 'h-0 opacity-0'
                      )}
                    />
                    <span
                      className={cn(
                        'flex items-center justify-center h-8 w-8 rounded-md transition-colors flex-shrink-0',
                        isActive
                          ? 'bg-sidebar-primary/15 text-sidebar-primary'
                          : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="h-3.5 w-3.5 text-sidebar-primary/70 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="flex-shrink-0 p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-sidebar-accent/40 mb-2">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-sidebar-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Admin'} />
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-sm font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <Badge
                variant="outline"
                className={cn('mt-1 text-[10px] px-1.5 py-0 h-4 font-medium', roleBadgeStyle(userRole))}
              >
                {roleLabel(userRole)}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 h-10"
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
          className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className="lg:ml-72 min-h-screen pt-14 sm:pt-16 lg:pt-0 flex flex-col"
        style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
      >
        <div className="p-3 sm:p-4 lg:p-8 flex-1">{children}</div>

        {/* Footer Credit */}
        <footer className="py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground border-t border-border">
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
