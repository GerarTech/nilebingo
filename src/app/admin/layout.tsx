'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Wallet, Gamepad2, Coins, Phone, Send, Settings, LogOut, Menu, X, PlusCircle, DollarSign, Shield
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'support' },
  { href: '/admin/users', label: 'Users', icon: Users, minRole: 'moderator' },
  { href: '/admin/transactions', label: 'Transactions', icon: Wallet, minRole: 'moderator' },
  { href: '/admin/bulk-deposit', label: 'Bulk Deposit', icon: PlusCircle, minRole: 'admin' },
  { href: '/admin/games', label: 'Games', icon: Gamepad2, minRole: 'support' },
  { href: '/admin/stakes', label: 'Stakes', icon: Coins, minRole: 'admin' },
  { href: '/admin/commission', label: 'Commission', icon: DollarSign, minRole: 'admin' },
  { href: '/admin/contacts', label: 'Contacts', icon: Phone, minRole: 'support' },
  { href: '/admin/broadcast', label: 'Broadcast', icon: Send, minRole: 'admin' },
  { href: '/admin/admin-users', label: 'Admin Users', icon: Shield, minRole: 'admin' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, minRole: 'admin' },
];

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4, admin: 3, moderator: 2, support: 1,
};

function roleHasAccess(userRole: string, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  super_admin: 'text-red-400 bg-red-500/10 border border-red-500/20',
  admin: 'text-gold bg-gold/10 border border-gold/20',
  moderator: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
  support: 'text-green-400 bg-green-500/10 border border-green-500/20',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminRole, setAdminRole] = useState('');

  useEffect(() => {
    // Check for new session cookie or legacy admin_token
    const sessionCookie = document.cookie.split('; ').find(r => r.startsWith('admin_session='));
    const legacyCookie = document.cookie.split('; ').find(r => r.startsWith('admin_token='));

    if (!sessionCookie && !legacyCookie) {
      if (pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    } else {
      setAuthed(true);
      const usernameCookie = document.cookie.split('; ').find(r => r.startsWith('admin_username='));
      const roleCookie = document.cookie.split('; ').find(r => r.startsWith('admin_role='));
      if (usernameCookie) setAdminUsername(usernameCookie.split('=')[1]);
      if (roleCookie) setAdminRole(roleCookie.split('=')[1]);
    }
  }, [router, pathname]);

  const handleLogout = () => {
    document.cookie = 'admin_session=; path=/; max-age=0';
    document.cookie = 'admin_token=; path=/; max-age=0';
    document.cookie = 'admin_username=; path=/; max-age=0';
    document.cookie = 'admin_role=; path=/; max-age=0';
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') return <>{children}</>;
  if (!authed) return null;

  const visibleNavItems = navItems.filter(item => roleHasAccess(adminRole || 'support', item.minRole));

  return (
    <div className="min-h-screen bg-[#283782] flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-navy-card p-2 rounded-xl"
      >
        {sidebarOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-navy-card border-r border-gold-subtle transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 border-b border-gold-subtle">
          <h1 className="text-xl font-black text-gold">NILE BINGO</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin Panel</p>
          {adminUsername && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-[10px]">
                {adminUsername.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] text-white font-medium leading-none">{adminUsername}</p>
                {adminRole && (
                  <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-full mt-0.5 ${ROLE_BADGE_COLORS[adminRole] || 'text-gray-400'}`}>
                    {adminRole}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <nav className="p-3 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gold-subtle">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 w-full">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-6 pt-16 lg:pt-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
