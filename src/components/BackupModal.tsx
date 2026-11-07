import React, { useState, useRef } from 'react';
import { 
  Download, Upload, RefreshCw, Shield, CheckCircle2, 
  AlertCircle, LogOut, User, Database, Sparkles 
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { translations } from '../utils/translations';
import { storageService } from '../utils/storage';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  user: UserProfile | null;
  onLogout: () => void;
  onDataRestored: () => void;
  onManualSync: () => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  language,
  user,
  onLogout,
  onDataRestored,
  onManualSync,
}) => {
  const t = translations[language];

  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    await storageService.downloadBackup();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ok = await storageService.restoreFromFile(file);
    if (ok) {
      setRestoreMessage(language === 'hi' ? 'डेटा सफलतापूर्वक रीस्टोर हो गया!' : 'Data restored successfully!');
      onDataRestored();
    } else {
      setRestoreMessage(language === 'hi' ? 'फ़ाइल प्रारूप अमान्य है।' : 'Invalid backup JSON file.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    await onManualSync();
    setSyncing(false);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.backup}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'hi' ? 'क्लाउड सिंक और डेटा सुरक्षा' : 'Cloud Sync & Data Protection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* User Card */}
        {user ? (
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.logout}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400">
            {t.guestMode}. {language === 'hi' ? 'सभी बदलाव आपके डिवाइस में सुरक्षित हैं।' : 'Changes are stored on this device.'}
          </div>
        )}

        {/* Sync Button */}
        {user && (
          <div className="space-y-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? (language === 'hi' ? 'सिंक हो रहा है...' : 'Syncing...') : t.syncWithCloud}</span>
            </button>
            {syncSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'डेटाबेस के साथ सिंक हो गया!' : 'Successfully synced with server!'}</span>
              </p>
            )}
          </div>
        )}

        {/* Backup & Restore Controls */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownload}
            className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all group"
          >
            <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.downloadBackup}
            </span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all group"
          >
            <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.restoreBackup}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {restoreMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{restoreMessage}</span>
          </div>
        )}

        {/* Security & Privacy Guarantee */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            {language === 'hi'
              ? 'आपकी व्यक्तिगत जानकारी और दैनिक रूटीन डेटा सुरक्षित है। कभी भी अपना बैकअप डाउनलोड करें।'
              : 'Your personal routine data is encrypted and permanently synced. You can download and restore backups anytime.'}
          </p>
        </div>
      </div>
    </div>
  );
};
