'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Wallet, Gamepad2, Coins, Phone, Send, Settings, LogOut, Menu, X
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/transactions', label: 'Transactions', icon: Wallet },
  { href: '/admin/games', label: 'Games', icon: Gamepad2 },
  { href: '/admin/stakes', label: 'Stakes', icon: Coins },
  { href: '/admin/contacts', label: 'Contacts', icon: Phone },
  { href: '/admin/broadcast', label: 'Broadcast', icon: Send },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = document.cookie.split('; ').find(r => r.startsWith('admin_token='));
    if (!token) {
      if (pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    } else {
      setAuthed(true);
    }
  }, [router, pathname]);

  const handleLogout = () => {
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') return <>{children}</>;
  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-navy-card p-2 rounded-xl"
      >
        {sidebarOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-navy-card border-r border-white/5 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 border-b border-white/5">
          <h1 className="text-xl font-black text-gold">FUA BINGO</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin Panel</p>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
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
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5">
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