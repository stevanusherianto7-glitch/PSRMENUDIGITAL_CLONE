import React from 'react';
import { LayoutDashboard, ChevronRight, LogOut } from 'lucide-react';
import { ConnectionBadge } from './ConnectionBadge';
import { ThemeToggle } from './ThemeToggle';
import type { Module, UserSession } from '../types';
import { BRAND_NAME, APP_LOGO, NAV_ITEMS, moduleLabels } from '../data';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeModule: Module;
  session: UserSession;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  connected: boolean;
  pendingOrdersCount: number;
  criticalAlerts: number;
  ttsEnabled: boolean;
  onToggleSidebar: () => void;
  onSetMobileSidebarOpen: (open: boolean) => void;
  onSetModule: (module: Module) => void;
  onToggleTts: () => void;
  onSpeakTest: () => void;
  onLogout: () => void;
}

export function AdminLayout({
  children,
  activeModule,
  session,
  sidebarOpen,
  mobileSidebarOpen,
  connected,
  pendingOrdersCount,
  criticalAlerts,
  ttsEnabled,
  onToggleSidebar,
  onSetMobileSidebarOpen,
  onSetModule,
  onToggleTts,
  onSpeakTest,
  onLogout
}: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/ backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => onSetMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out
        lg:static lg:z-auto
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${sidebarOpen || mobileSidebarOpen ? "w-64" : "w-20"}
      `}
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border overflow-hidden">
          <div className="flex items-center w-full">
            <img src={APP_LOGO} alt="Logo" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow-sm" />
            <div className={`transition-all duration-300 ease-in-out flex flex-col min-w-0 ${
              sidebarOpen || mobileSidebarOpen 
                ? "opacity-100 translate-x-0 w-auto ml-3 pointer-events-auto" 
                : "opacity-0 -translate-x-10 w-0 ml-0 pointer-events-none overflow-hidden"
            }`}>
              <p className="font-black text-sm text-foreground leading-tight font-['Poppins'] truncate whitespace-nowrap">{BRAND_NAME}</p>
              <p className="text-[10px] text-muted-foreground leading-tight uppercase tracking-wider font-black truncate">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            const hasBadge = (item.id === "stok" && criticalAlerts > 0) || (item.id === "orders" && pendingOrdersCount > 0);
            const badgeCount = item.id === "stok" ? criticalAlerts : pendingOrdersCount;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSetModule(item.id);
                  if (window.innerWidth < 1024) onSetMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-xl text-left transition-all group relative ${sidebarOpen || mobileSidebarOpen ? "px-3 py-2.5 gap-3" : "p-3 justify-center"
                  } ${active
                    ? "text-primary drop-shadow-[0_0_8px_rgba(232,119,34,0.8)]"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                title={!sidebarOpen && !mobileSidebarOpen ? item.label : undefined}
              >
                <Icon size={22} className={`flex-shrink-0 transition-transform ${active ? "scale-110" : "group-hover:scale-110"}`} />

                <span className={`inline-block whitespace-nowrap font-black text-xs uppercase tracking-wider transition-all duration-300 truncate ${
                  active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                } ${
                  sidebarOpen || mobileSidebarOpen 
                    ? "opacity-100 translate-x-0 w-auto pointer-events-auto" 
                    : "opacity-0 -translate-x-10 w-0 pointer-events-none overflow-hidden"
                }`}>
                  {item.label}
                </span>

                {hasBadge && (
                  <span className={`absolute bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-sidebar flex items-center justify-center ${sidebarOpen || mobileSidebarOpen
                      ? "right-3 px-1.5 py-0.5"
                      : "top-2 right-2 w-4 h-4"
                    }`}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border flex flex-col items-center gap-4">
          <button
            onClick={onLogout}
            className="p-3 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all group flex items-center justify-center w-full"
            title="Keluar"
          >
            <LogOut size={22} className="flex-shrink-0 transition-transform group-hover:scale-110" />
          </button>

          <ConnectionBadge connected={connected} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-50 flex-shrink-0">
          {/* Hamburger for Mobile */}
          <button
            onClick={() => onSetMobileSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Buka menu mobile"
          >
            <LayoutDashboard size={20} />
          </button>

          {/* Sidebar Toggle for Desktop */}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Toggle sidebar"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x={3} y={3} width={7} height={7} />
              <rect x={14} y={3} width={7} height={7} />
              <rect x={14} y={14} width={7} height={7} />
              <rect x={3} y={14} width={7} height={7} />
            </svg>
          </button>

          <div className="flex items-center gap-3 overflow-hidden">
            <img src={APP_LOGO} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 hidden sm:block" />
            <div className="flex items-center gap-2 text-xs font-medium truncate">
              <span className="text-muted-foreground hidden md:inline">{BRAND_NAME}</span>
              <ChevronRight size={14} className="text-muted-foreground/50 hidden md:inline" />
              <span className="text-foreground font-bold">{moduleLabels[activeModule]}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:gap-4">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-scroll px-0 lg:px-10 pb-40 pb-safe scroll-smooth custom-scrollbar relative">
          {children}
        </main>
      </div>
    </div>
  );
}
