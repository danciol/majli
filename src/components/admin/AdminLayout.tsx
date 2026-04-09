import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Scissors, Users, ClipboardList, LogOut, Menu, X, UserCheck, MessageSquare, Settings, Images,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useFirestore';

const allLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'pracownik'] },
  { to: '/admin/kalendarz', label: 'Kalendarz', icon: Calendar, roles: ['admin', 'pracownik'] },
  { to: '/admin/wizyty', label: 'Wizyty', icon: ClipboardList, roles: ['admin'] },
  { to: '/admin/klienci', label: 'Klienci', icon: UserCheck, roles: ['admin'] },
  { to: '/admin/wiadomosci', label: 'Wiadomości', icon: MessageSquare, roles: ['admin'] },
  { to: '/admin/ustawienia', label: 'Ustawienia', icon: Settings, roles: ['admin'] },
  { to: '/admin/galeria', label: 'Galeria', icon: Images, roles: ['admin'] },
  { to: '/admin/uslugi', label: 'Usługi', icon: Scissors, roles: ['admin'] },
  { to: '/admin/pracownicy', label: 'Pracownicy', icon: Users, roles: ['admin'] },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, employee, logout, loading } = useAuth();
  const { appointments } = useAppointments();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-muted-foreground">Ładowanie...</span></div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  const role = employee?.role || 'pracownik';
  const links = allLinks.filter(l => l.roles.includes(role));

  // Liczba wizyt oczekujących na potwierdzenie
  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex bg-secondary/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <Link to="/" className="font-heading text-xl font-bold text-primary">Majli Beauty</Link>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {links.map((link) => {
            const active = location.pathname === link.to;
            const isWizyty = link.to === '/admin/wizyty';
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span className="flex-1">{link.label}</span>
                {isWizyty && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-muted-foreground">Zalogowano jako</p>
            <p className="text-sm font-medium text-foreground truncate">{employee?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{employee?.role || 'pracownik'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground font-medium">Panel Administracyjny</span>
          {pendingCount > 0 && (
            <Link
              to="/admin/wizyty"
              className="ml-auto flex items-center gap-2 text-xs font-medium text-destructive hover:underline"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
              {pendingCount === 1 ? 'wizyta czeka na potwierdzenie' : `wizyty czekają na potwierdzenie`}
            </Link>
          )}
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
