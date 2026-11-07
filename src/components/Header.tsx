import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Bell, BellRing, Sparkles, User, 
  CloudCheck, Languages, CheckCircle2, Shield
} from 'lucide-react';
import { Language, Theme, UserProfile } from '../types';
import { translations } from '../utils/translations';
import { notificationService } from '../utils/notifications';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: Theme;
  onThemeToggle: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  onOpenBackup: () => void;
  unreadNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  theme,
  onThemeToggle,
  user,
  onOpenAuth,
  onOpenNotifications,
  onOpenBackup,
  unreadNotificationsCount,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const t = translations[language];

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {language === 'hi' ? 'मेरी दिनचर्या' : 'My Life Manager'}
            </h1>
            <p className="hidden sm:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Zone 2: Digital Clock (Live Ticker) */}
        <div className="flex items-center justify-center px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 font-mono text-xs sm:text-sm font-semibold tracking-wider tabular-nums shadow-inner">
          {currentTime || '00:00:00'}
        </div>

        {/* Zone 3: Actions & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Switch Language / भाषा बदलें"
            aria-label="Toggle language"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="tabular-nums font-mono">{language === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? t.lightMode : t.darkMode}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Notifications Drawer Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t.notifications}
            aria-label="Notifications"
          >
            {unreadNotificationsCount > 0 ? (
              <BellRing className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {/* User Account / Backup Sync Button */}
          <button
            onClick={user ? onOpenBackup : onOpenAuth}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              user
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[70px] sm:max-w-[100px] truncate">
              {user ? user.name.split(' ')[0] : t.login}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
