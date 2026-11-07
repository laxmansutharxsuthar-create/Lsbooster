import React, { useState, useEffect } from 'react';
import { 
  Bell, BellRing, Volume2, VolumeX, CheckCircle2, 
  Trash2, Sparkles, Clock, ShieldCheck, X 
} from 'lucide-react';
import { AppNotification, Language, UserSettings } from '../types';
import { translations } from '../utils/translations';
import { notificationService } from '../utils/notifications';
import { soundManager } from '../utils/audio';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  language,
  settings,
  onUpdateSettings,
}) => {
  const t = translations[language];

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  useEffect(() => {
    setPermissionGranted(notificationService.isPermissionGranted());
    const unsub = notificationService.subscribe((list) => {
      setNotifications(list);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermissionGranted(granted);
    if (granted) {
      notificationService.notify(
        t.appName,
        language === 'hi' ? 'सूचनाएं सफलतापूर्वक सक्रिय कर दी गई हैं!' : 'Browser notifications enabled successfully!',
        'reminder'
      );
    }
  };

  const handleTestChime = () => {
    soundManager.playChime();
    notificationService.notify(
      language === 'hi' ? 'टेस्ट नोटिफिकेशन' : 'Test Routine Reminder',
      language === 'hi' ? 'आपकी अगली गतिविधि 10 मिनट में शुरू होगी।' : 'Your next scheduled activity begins in 10 minutes.',
      'reminder'
    );
  };

  const handleClearAll = () => {
    notificationService.clearAll();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t.notifications}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Browser Permission Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${permissionGranted ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {permissionGranted ? t.notificationsAllowed : t.enableNotifications}
                </span>
              </div>
            </div>

            {!permissionGranted && (
              <button
                onClick={handleRequestPermission}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {t.enableNotifications}
              </button>
            )}

            <button
              onClick={handleTestChime}
              className="w-full py-2 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              {t.testNotification}
            </button>
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'hi' ? 'अलर्ट प्राथमिकताएं' : 'Alert Preferences'}
            </h4>

            {/* Lead Time */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.leadTimeLabel}
              </label>
              <select
                value={settings.leadTimeMinutes}
                onChange={(e) => onUpdateSettings({ leadTimeMinutes: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={5}>{t.fiveMinutes}</option>
                <option value={10}>{t.tenMinutes}</option>
                <option value={15}>{t.fifteenMinutes}</option>
              </select>
            </div>

            {/* Sound Toggle */}
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <span className="flex items-center gap-2">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span>{t.soundToggle}</span>
              </span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="text-indigo-600 rounded"
              />
            </label>
          </div>

          {/* Recent Notification Feed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'hi' ? 'हाल की सूचनाएं' : 'Recent Feed'}
              </h4>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t.clearAll}</span>
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {t.noNotifications}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
