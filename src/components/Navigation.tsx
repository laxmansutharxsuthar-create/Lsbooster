import React from 'react';
import { LayoutDashboard, CalendarRange, Timer, Calendar, BarChart3 } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

export type NavTab = 'dashboard' | 'routine' | 'timer' | 'calendar' | 'analytics';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  language: Language;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab, language }) => {
  const t = translations[language];

  const tabs: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: t.today, icon: LayoutDashboard },
    { id: 'routine', label: t.routines, icon: CalendarRange },
    { id: 'timer', label: t.timer, icon: Timer },
    { id: 'calendar', label: t.calendar, icon: Calendar },
    { id: 'analytics', label: t.analytics, icon: BarChart3 },
  ];

  return (
    <>
      {/* Desktop Top Sub-Bar Tabs */}
      <nav aria-label="Desktop Navigation" className="hidden md:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/70 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav aria-label="Mobile Bottom Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-semibold tracking-tight mt-1 truncate max-w-[62px]">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
