import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Webhook,
  ChevronDown,
  Palette,
  Link2,
  Activity,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Formulários', href: '/admin/forms', icon: FileText },
  { name: 'Leads', href: '/admin/leads', icon: Users },
  { name: 'Links', href: '/admin/links', icon: Link2 },
  { name: 'Logs de Integração', href: '/admin/integrations-logs', icon: Activity },
  { name: 'Usuários', href: '/admin/users', icon: UserCog, adminOnly: true },
  { name: 'Evolution API', href: '/admin/evolution', icon: MessageSquare },
  { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
  { name: 'Branding', href: '/admin/branding', icon: Palette, adminOnly: true },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: systemSettings } = useSystemSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const systemName = systemSettings?.system_name || 'R2D2';
  const systemLogo = systemSettings?.system_logo_url;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Vibrant Gradient */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:static lg:translate-x-0',
          'sidebar-gradient text-white shadow-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
            <Link to="/admin" className="flex items-center gap-3">
              {systemLogo ? (
                <img src={systemLogo} alt={systemName} className="h-9 w-auto object-contain drop-shadow-lg" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="text-xl font-bold text-white drop-shadow-sm">{systemName}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigation
              .filter((item) => !item.adminOnly || user?.role === 'admin')
              .map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/admin' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-white text-primary shadow-lg'
                        : 'text-white/80 hover:bg-white/15 hover:text-white'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                    {item.name}
                  </Link>
                );
              })}
          </nav>

          {/* User section */}
          <div className="border-t border-white/10 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-white hover:bg-white/15 rounded-xl py-3 h-auto"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <span className="text-sm font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-white/60">{user?.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header - Vibrant */}
        <header className="flex h-16 items-center gap-4 bg-vibrant-gradient px-4 lg:hidden shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          {systemLogo ? (
            <img src={systemLogo} alt={systemName} className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-xl font-bold text-white">{systemName}</span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>

        {/* Footer - Vibrant */}
        <footer className="bg-vibrant-gradient px-4 py-3 text-center text-sm font-medium text-white shadow-inner">
          R2D2 - TNS
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
