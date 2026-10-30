import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Bot,
  User as UserIcon,
  LogOut,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'wizard' | 'history' | 'tutor' | 'profile';

interface FloatingDockProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  userName?: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  userName,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'wizard', label: 'New Mock Test', icon: <PlusCircle className="w-5 h-5 text-indigo-400" /> },
    { id: 'history', label: 'Past Tests', icon: <History className="w-5 h-5" /> },
    { id: 'tutor', label: 'AI Doubt Tutor', icon: <Bot className="w-5 h-5 text-purple-400" /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-5 h-5" /> },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-2xl glass-dock flex items-center gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10"
      title={userName ? `Logged in as ${userName}` : undefined}
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-white/15 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] border border-white/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <div className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'scale-105' : ''}`}>
              {item.icon}
            </div>
            <span className="hidden md:inline font-medium">{item.label}</span>
          </button>
        );
      })}

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Logout button */}
      <button
        onClick={onLogout}
        title="Sign Out"
        className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden lg:inline text-xs">Exit</span>
      </button>
    </nav>
  );
};
