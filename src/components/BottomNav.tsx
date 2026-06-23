"use client";

import { Map, Camera, LayoutGrid, BarChart2, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', icon: Map, label: 'Map' },
    { href: '/feed', icon: LayoutGrid, label: 'Feed' },
    { href: '/register', icon: Camera, label: 'Registrar', isPrimary: true },
    { href: '/stats', icon: BarChart2, label: 'Stats' },
    { href: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel pb-safe">
      <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link key={item.href} href={item.href} className="relative -top-5">
                <div className="flex items-center justify-center w-14 h-14 bg-black rounded-full text-[var(--color-graffiti-chrome)] shadow-[0_0_15px_rgba(255,30,39,0.5)] border-2 border-[var(--color-graffiti-red)] transform transition-transform hover:scale-105 active:scale-95">
                  <Icon size={24} strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 h-full space-y-1 transition-colors ${
                isActive ? 'text-[var(--color-neon-green)]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-glow' : ''} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
