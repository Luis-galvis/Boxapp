import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Package, FileText, BoxIcon, Scissors, ShoppingCart, LayoutDashboard, Users, Menu, X, LogOut, FileStack, Truck, Users2, MapPin, Ruler, Briefcase, Receipt, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface MenuGroup {
  title: string;
  id?: string;
  adminOnly?: boolean;
  links: NavLink[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'General',
    links: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Inventario',
    id: 'inventario',
    links: [
      { to: '/facturas', label: 'Facturas Compra', icon: FileText, adminOnly: true },
      { to: '/inventario', label: 'Inventario', icon: Package },
      { to: '/abrir-caja', label: 'Abrir Caja', icon: Scissors },
      { to: '/remisiones', label: 'Remisiones', icon: FileStack, adminOnly: true },
      { to: '/tallas', label: 'Tallas', icon: Ruler, adminOnly: true },
      { to: '/locales', label: 'Locales', icon: MapPin, adminOnly: true },
    ]
  },
  {
    title: 'Ventas',
    id: 'ventas',
    links: [
      { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
      { to: '/facturas-venta', label: 'Facturas Venta', icon: Receipt, adminOnly: true },
      { to: '/pedidos', label: 'Pedidos', icon: Truck },
    ]
  },
  {
    title: 'Contactos',
    id: 'contactos',
    links: [
      { to: '/compradores', label: 'Compradores', icon: Users2, adminOnly: true },
      { to: '/proveedores', label: 'Proveedores', icon: Briefcase, adminOnly: true },
    ]
  },
  {
    title: 'Administración',
    id: 'admin',
    adminOnly: true,
    links: [
      { to: '/usuarios', label: 'Usuarios', icon: Users },
    ]
  }
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Auto-open group that contains the current location
    const initialOpen: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      if (group.id && group.links.some(l => l.to === location.pathname)) {
        initialOpen[group.id] = true;
      }
    });
    setOpenGroups(prev => ({ ...prev, ...initialOpen }));
  }, [location.pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const renderLinks = (isMobile = false) => {
    return menuGroups.map((group, groupIdx) => {
      if (group.adminOnly && !isAdmin) return null;

      const visibleLinks = group.links.filter(link => !link.adminOnly || isAdmin);
      if (visibleLinks.length === 0) return null;

      // Group without ID is always visible (like General)
      if (!group.id) {
        return (
          <div key={groupIdx} className={`${groupIdx > 0 ? 'mt-4' : ''}`}>
            <div className="space-y-0.5">
              {visibleLinks.map(link => {
                const Icon = link.icon;
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                      ? (isMobile ? 'bg-primary text-primary-foreground' : 'bg-sidebar-primary text-sidebar-primary-foreground')
                      : (isMobile ? 'text-muted-foreground hover:bg-muted' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      }

      const isOpen = !!openGroups[group.id];

      return (
        <div key={groupIdx} className={`${groupIdx > 0 ? 'mt-4' : ''}`}>
          <button
            onClick={() => toggleGroup(group.id!)}
            className="w-full flex items-center justify-between px-3 mb-1 group"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60 transition-colors">
              {group.title}
            </p>
            {isOpen ? <ChevronDown className="h-3 w-3 text-sidebar-foreground/40" /> : <ChevronRight className="h-3 w-3 text-sidebar-foreground/40" />}
          </button>

          {isOpen && (
            <div className="space-y-0.5 animate-in slide-in-from-top-1 duration-200">
              {visibleLinks.map(link => {
                const Icon = link.icon;
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                      ? (isMobile ? 'bg-primary text-primary-foreground' : 'bg-sidebar-primary text-sidebar-primary-foreground')
                      : (isMobile ? 'text-muted-foreground hover:bg-muted' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-heading text-xl font-bold text-sidebar-primary flex items-center gap-2">
            <BoxIcon className="h-6 w-6" />
            StockBox
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Gestión de Inventario</p>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {renderLinks()}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 truncate mb-2">{user?.email}</p>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-20">
          <h1 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
            <BoxIcon className="h-5 w-5" />
            StockBox
          </h1>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border p-3 space-y-1 animate-fade-in fixed top-[65px] left-0 right-0 z-20 max-h-[calc(100vh-65px)] overflow-y-auto shadow-xl">
            {renderLinks(true)}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive w-full hover:bg-destructive/5"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
