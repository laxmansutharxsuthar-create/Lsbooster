import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  RoutineItem, DailyRecord, Goal, UserSettings, 
  UserProfile, Language, Theme, TaskStatus 
} from './types';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { RoutineManager } from './components/RoutineManager';
import { FocusTimer } from './components/FocusTimer';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuthModal } from './components/AuthModal';
import { BackupModal } from './components/BackupModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { storageService } from './utils/storage';
import { notificationService } from './utils/notifications';
import { routineTemplates } from './data/presetData';

export default function App() {
  // App settings & theme
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Core Data
  const [user, setUser] = useState<UserProfile | null>(null);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [records, setRecords] = useState<Record<string, DailyRecord[]>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    language: 'en',
    theme: 'dark',
    notificationsEnabled: true,
    leadTimeMinutes: 10,
    soundEnabled: true,
    morningReminderTime: '06:30',
    eveningReviewTime: '21:30',
  });

  // Active Timer target
  const [activeTimerRoutine, setActiveTimerRoutine] = useState<RoutineItem | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Keep track of alerted task ids today so we don't spam
  const alertedTasksRef = useRef<Set<string>>(new Set());

  // Apply dark mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Initial Load from storage & server
  useEffect(() => {
    const savedUser = storageService.getUser();
    if (savedUser) setUser(savedUser);

    const savedSettings = storageService.getLocalSettings();
    setSettings(savedSettings);
    setLanguage(savedSettings.language || 'en');
    setTheme(savedSettings.theme || 'dark');

    const localRoutines = storageService.getLocalRoutines();
    const localRecords = storageService.getLocalRecords();
    const localGoals = storageService.getLocalGoals();

    if (localRoutines.length > 0) setRoutines(localRoutines);
    if (Object.keys(localRecords).length > 0) setRecords(localRecords);
    if (localGoals.length > 0) setGoals(localGoals);

    // Fetch from backend if token exists
    storageService.fetchRemoteData().then((remote) => {
      if (remote) {
        if (remote.routines) setRoutines(remote.routines);
        if (remote.records) setRecords(remote.records);
        if (remote.goals) setGoals(remote.goals);
        if (remote.settings) {
          setSettings(remote.settings);
          setLanguage(remote.settings.language);
          setTheme(remote.settings.theme);
        }
      } else if (localRoutines.length === 0) {
        // If first time and no local routines, apply student/fitness starter template
        const starter = routineTemplates[0];
        const initialRoutines: RoutineItem[] = starter.items.map((item, idx) => ({
          ...item,
          id: 'rt_init_' + idx,
          userId: 'guest',
          order: idx + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setRoutines(initialRoutines);
        storageService.setLocalRoutines(initialRoutines);

        const initialGoals: Goal[] = [
          { id: 'g_1', userId: 'guest', title: 'Drink 3L Water', category: 'health', target: 3000, unit: 'ml', history: {} },
          { id: 'g_2', userId: 'guest', title: 'Daily Workout', category: 'exercise', target: 45, unit: 'mins', history: {} },
          { id: 'g_3', userId: 'guest', title: 'Study / Reading', category: 'study', target: 45, unit: 'mins', history: {} },
          { id: 'g_4', userId: 'guest', title: 'Restful Sleep', category: 'sleep', target: 8, unit: 'hours', history: {} },
        ];
        setGoals(initialGoals);
        storageService.setLocalGoals(initialGoals);
      }
    });

    // Subscribe to notification count
    const unsub = notificationService.subscribe((list) => {
      const unread = list.filter((n) => !n.read).length;
      setUnreadCount(unread);
    });

    return unsub;
  }, []);

  // Sync state to local storage and remote server
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queueSync = useCallback(() => {
    storageService.setLocalRoutines(routines);
    storageService.setLocalRecords(records);
    storageService.setLocalGoals(goals);
    storageService.setLocalSettings(settings);

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      storageService.syncWithRemote({ routines, records, goals, settings });
    }, 1500);
  }, [routines, records, goals, settings]);

  useEffect(() => {
    queueSync();
  }, [routines, records, goals, settings, queueSync]);

  // Routine Reminder Interval Prober
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const totalMinutesNow = currentHours * 60 + currentMins;
      const todayDayOfWeek = now.getDay();
      const leadTime = settings.leadTimeMinutes || 10;

      routines.forEach((r) => {
        // Check if recurring today
        const matchesDay = r.recurringDays === 'daily' || 
          (Array.isArray(r.recurringDays) && r.recurringDays.includes(todayDayOfWeek));

        if (!matchesDay) return;

        const [sH, sM] = r.startTime.split(':').map(Number);
        const routineStartMinutes = sH * 60 + sM;
        const diff = routineStartMinutes - totalMinutesNow;

        // Trigger notification if within lead time window and not yet alerted
        if (diff > 0 && diff <= leadTime) {
          const alertKey = `${r.id}_${now.toISOString().slice(0, 10)}`;
          if (!alertedTasksRef.current.has(alertKey)) {
            alertedTasksRef.current.add(alertKey);
            notificationService.notify(
              language === 'hi' ? `आगामी गतिविधि: ${r.title}` : `Upcoming Activity: ${r.title}`,
              language === 'hi'
                ? `यह गतिविधि ${diff} मिनट में (${r.startTime}) शुरू होगी।`
                : `This activity starts in ${diff} minutes (at ${r.startTime}).`,
              'reminder',
              settings.soundEnabled
            );
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 20000);
    return () => clearInterval(interval);
  }, [routines, settings, language]);

  // Handlers for Today's Dashboard & Records
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = yesterdayDate.toISOString().slice(0, 10);

  const todayRecords = records[todayKey] || [];
  const yesterdayRecords = records[yesterdayKey] || [];

  const handleUpdateTaskStatus = (routineId: string, status: TaskStatus) => {
    setRecords((prev) => {
      const currentDayRecords = prev[todayKey] || [];
      const existingIdx = currentDayRecords.findIndex((r) => r.routineId === routineId);

      let updatedList = [...currentDayRecords];
      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      } else {
        updatedList.push({
          id: 'rec_' + Date.now(),
          routineId,
          userId: user?.id || 'guest',
          date: todayKey,
          status,
          actualMinutes: 0,
          rating: 0,
          notes: '',
          completedAt: status === 'completed' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        });
      }

      if (status === 'completed' && settings.soundEnabled) {
        notificationService.notify(
          language === 'hi' ? 'कार्य पूर्ण!' : 'Task Completed!',
          language === 'hi' ? 'शाबाश! आपने यह गतिविधि पूरी कर ली है।' : 'Great job completing this routine activity!',
          'completion',
          true
        );
      }

      return { ...prev, [todayKey]: updatedList };
    });
  };

  const handleUpdateTaskRating = (routineId: string, rating: number) => {
    setRecords((prev) => {
      const currentDayRecords = prev[todayKey] || [];
      const existingIdx = currentDayRecords.findIndex((r) => r.routineId === routineId);
      let updatedList = [...currentDayRecords];

      if (existingIdx >= 0) {
        updatedList[existingIdx] = { ...updatedList[existingIdx], rating };
      } else {
        updatedList.push({
          id: 'rec_' + Date.now(),
          routineId,
          userId: user?.id || 'guest',
          date: todayKey,
          status: 'pending',
          actualMinutes: 0,
          rating,
          notes: '',
          completedAt: null,
          updatedAt: new Date().toISOString(),
        });
      }
      return { ...prev, [todayKey]: updatedList };
    });
  };

  const handleUpdateTaskNotes = (routineId: string, notes: string) => {
    setRecords((prev) => {
      const currentDayRecords = prev[todayKey] || [];
      const existingIdx = currentDayRecords.findIndex((r) => r.routineId === routineId);
      let updatedList = [...currentDayRecords];

      if (existingIdx >= 0) {
        updatedList[existingIdx] = { ...updatedList[existingIdx], notes };
      } else {
        updatedList.push({
          id: 'rec_' + Date.now(),
          routineId,
          userId: user?.id || 'guest',
          date: todayKey,
          status: 'pending',
          actualMinutes: 0,
          rating: 0,
          notes,
          completedAt: null,
          updatedAt: new Date().toISOString(),
        });
      }
      return { ...prev, [todayKey]: updatedList };
    });
  };

  const handleUpdateGoalProgress = (goalId: string, delta: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const currentVal = g.history[todayKey] || 0;
        const newVal = Math.max(0, currentVal + delta * (g.unit === 'ml' ? 250 : 5));
        return {
          ...g,
          history: { ...g.history, [todayKey]: newVal },
        };
      })
    );
  };

  const handleRecordTimeFromTimer = (routineId: string, minutes: number, markCompleted: boolean) => {
    setRecords((prev) => {
      const currentDayRecords = prev[todayKey] || [];
      const existingIdx = currentDayRecords.findIndex((r) => r.routineId === routineId);
      let updatedList = [...currentDayRecords];

      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          actualMinutes: (updatedList[existingIdx].actualMinutes || 0) + minutes,
          status: markCompleted ? 'completed' : updatedList[existingIdx].status,
          completedAt: markCompleted ? new Date().toISOString() : updatedList[existingIdx].completedAt,
          updatedAt: new Date().toISOString(),
        };
      } else {
        updatedList.push({
          id: 'rec_' + Date.now(),
          routineId,
          userId: user?.id || 'guest',
          date: todayKey,
          status: markCompleted ? 'completed' : 'pending',
          actualMinutes: minutes,
          rating: 0,
          notes: '',
          completedAt: markCompleted ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        });
      }
      return { ...prev, [todayKey]: updatedList };
    });
  };

  const handleUpdateStatusForDate = (dateKey: string, routineId: string, status: TaskStatus) => {
    setRecords((prev) => {
      const dayList = prev[dateKey] || [];
      const idx = dayList.findIndex((r) => r.routineId === routineId);
      let updatedList = [...dayList];

      if (idx >= 0) {
        updatedList[idx] = {
          ...updatedList[idx],
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      } else {
        updatedList.push({
          id: 'rec_' + Date.now(),
          routineId,
          userId: user?.id || 'guest',
          date: dateKey,
          status,
          actualMinutes: 0,
          rating: 0,
          notes: '',
          completedAt: status === 'completed' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        });
      }
      return { ...prev, [dateKey]: updatedList };
    });
  };

  // Routine Manager CRUD
  const handleAddRoutine = (item: Omit<RoutineItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const newItem: RoutineItem = {
      ...item,
      id: 'rt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: user?.id || 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRoutines((prev) => [...prev, newItem]);
  };

  const handleUpdateRoutine = (item: RoutineItem) => {
    setRoutines((prev) => prev.map((r) => (r.id === item.id ? item : r)));
  };

  const handleDeleteRoutine = (id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = routineTemplates.find((t) => t.id === templateId);
    if (!tmpl) return;

    const newItems: RoutineItem[] = tmpl.items.map((it, idx) => ({
      ...it,
      id: 'rt_' + Date.now() + '_' + idx,
      userId: user?.id || 'guest',
      order: routines.length + idx + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setRoutines((prev) => [...prev, ...newItems]);
    notificationService.notify(
      language === 'hi' ? 'टेम्पलेट लोड हो गया!' : 'Template Applied!',
      language === 'hi' ? `${tmpl.nameHi} की गतिविधियां जोड़ दी गई हैं।` : `${tmpl.nameEn} loaded into your daily schedule.`,
      'completion',
      settings.soundEnabled
    );
  };

  // Settings & Theme updates
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    const updated = { ...settings, language: newLang };
    setSettings(updated);
    storageService.setLocalSettings(updated);
  };

  const handleThemeToggle = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    const updated: UserSettings = { ...settings, theme: newTheme };
    setSettings(updated);
    storageService.setLocalSettings(updated);
  };

  const handleUpdateSettings = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    storageService.setLocalSettings(updated);
  };

  const handleLogout = () => {
    storageService.clearToken();
    setUser(null);
    setIsBackupOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        unreadNotificationsCount={unreadCount}
      />

      {/* Navigation Bar */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        language={language}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-6 pb-24 md:pb-12">
        {currentTab === 'dashboard' && (
          <Dashboard
            language={language}
            user={user}
            routines={routines}
            todayRecords={todayRecords}
            yesterdayRecords={yesterdayRecords}
            goals={goals}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onUpdateTaskRating={handleUpdateTaskRating}
            onUpdateTaskNotes={handleUpdateTaskNotes}
            onUpdateGoalProgress={handleUpdateGoalProgress}
            onStartFocusTimer={(routine) => {
              setActiveTimerRoutine(routine);
              setCurrentTab('timer');
            }}
            onNavigateToRoutineManager={() => setCurrentTab('routine')}
            onNavigateToTemplates={() => {
              setCurrentTab('routine');
            }}
          />
        )}

        {currentTab === 'routine' && (
          <RoutineManager
            language={language}
            routines={routines}
            onAddRoutine={handleAddRoutine}
            onUpdateRoutine={handleUpdateRoutine}
            onDeleteRoutine={handleDeleteRoutine}
            onReorderRoutines={setRoutines}
            onApplyTemplate={handleApplyTemplate}
          />
        )}

        {currentTab === 'timer' && (
          <FocusTimer
            language={language}
            routines={routines}
            activeRoutine={activeTimerRoutine}
            onSelectRoutine={setActiveTimerRoutine}
            onRecordTime={handleRecordTimeFromTimer}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            language={language}
            routines={routines}
            records={records}
            onUpdateStatusForDate={handleUpdateStatusForDate}
            onNavigateToRoutineManager={() => setCurrentTab('routine')}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            language={language}
            routines={routines}
            records={records}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={language}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          storageService.fetchRemoteData().then((remote) => {
            if (remote) {
              if (remote.routines) setRoutines(remote.routines);
              if (remote.records) setRecords(remote.records);
              if (remote.goals) setGoals(remote.goals);
            }
          });
        }}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        language={language}
        user={user}
        onLogout={handleLogout}
        onDataRestored={() => {
          setRoutines(storageService.getLocalRoutines());
          setRecords(storageService.getLocalRecords());
          setGoals(storageService.getLocalGoals());
        }}
        onManualSync={async () => {
          await storageService.syncWithRemote({ routines, records, goals, settings });
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        language={language}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
