import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, CheckCircle2, Flame, 
  Volume2, VolumeX, Sparkles, Clock, Target, ArrowRight 
} from 'lucide-react';
import { RoutineItem, Language, TaskStatus } from '../types';
import { translations } from '../utils/translations';
import { soundManager } from '../utils/audio';
import { notificationService } from '../utils/notifications';

interface FocusTimerProps {
  language: Language;
  routines: RoutineItem[];
  activeRoutine: RoutineItem | null;
  onSelectRoutine: (routine: RoutineItem | null) => void;
  onRecordTime: (routineId: string, minutes: number, markCompleted: boolean) => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  language,
  routines,
  activeRoutine,
  onSelectRoutine,
  onRecordTime,
}) => {
  const t = translations[language];

  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [selectedDurationMins, setSelectedDurationMins] = useState<number>(
    activeRoutine?.durationMinutes || 25
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(selectedDurationMins * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [soundTicking, setSoundTicking] = useState<boolean>(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial duration when active routine changes
  useEffect(() => {
    if (activeRoutine) {
      setSelectedDurationMins(activeRoutine.durationMinutes);
      setSecondsLeft(activeRoutine.durationMinutes * 60);
      setElapsedSeconds(0);
      setIsActive(false);
      setShowCompletionBanner(false);
    }
  }, [activeRoutine]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (mode === 'countdown') {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setIsActive(false);
              handleTimerCompleted();
              return 0;
            }
            if (soundTicking && prev % 2 === 0) {
              soundManager.playTick();
            }
            return prev - 1;
          });
          setElapsedSeconds((prev) => prev + 1);
        } else {
          setElapsedSeconds((prev) => {
            if (soundTicking && prev % 2 === 0) {
              soundManager.playTick();
            }
            return prev + 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode, soundTicking]);

  const handleTimerCompleted = () => {
    soundManager.playSuccessFanfare();
    setShowCompletionBanner(true);
    notificationService.notify(
      t.sessionFinished,
      activeRoutine ? `${activeRoutine.title} focus session complete!` : 'Focus session completed!',
      'completion'
    );
  };

  const handleStartPause = () => {
    setIsActive(!isActive);
    setShowCompletionBanner(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setShowCompletionBanner(false);
    if (mode === 'countdown') {
      setSecondsLeft(selectedDurationMins * 60);
    }
    setElapsedSeconds(0);
  };

  const handleDurationSelect = (mins: number) => {
    setSelectedDurationMins(mins);
    setSecondsLeft(mins * 60);
    setElapsedSeconds(0);
    setIsActive(false);
    setShowCompletionBanner(false);
  };

  const handleFinishAndRecord = () => {
    const minutesSpent = Math.max(1, Math.round(elapsedSeconds / 60));
    if (activeRoutine) {
      onRecordTime(activeRoutine.id, minutesSpent, true);
    }
    soundManager.playSuccessFanfare();
    setShowCompletionBanner(true);
    setIsActive(false);
  };

  // Formatted display
  const currentTotal = mode === 'countdown' ? secondsLeft : elapsedSeconds;
  const mins = Math.floor(currentTotal / 60);
  const secs = currentTotal % 60;
  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Progress percentage
  const totalTargetSeconds = selectedDurationMins * 60;
  const progressPct = mode === 'countdown'
    ? Math.max(0, Math.min(100, Math.round(((totalTargetSeconds - secondsLeft) / totalTargetSeconds) * 100)))
    : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t.focusTimerTitle}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t.focusTimerDesc}
        </p>
      </div>

      {/* Routine Task Picker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{t.selectTaskToFocus}</span>
          </label>
          {activeRoutine && (
            <button
              onClick={() => onSelectRoutine(null)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              {language === 'hi' ? 'कस्टम सत्र चुनें' : 'Switch to Custom'}
            </button>
          )}
        </div>

        <select
          value={activeRoutine?.id || 'custom'}
          onChange={(e) => {
            const found = routines.find((r) => r.id === e.target.value);
            onSelectRoutine(found || null);
          }}
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="custom">-- {t.customSession} --</option>
          {routines.map((r) => (
            <option key={r.id} value={r.id}>
              {r.startTime} - {r.endTime}: {r.title} ({r.durationMinutes} {t.minutes})
            </option>
          ))}
        </select>
      </div>

      {/* Main Timer Display Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-lg relative overflow-hidden space-y-8">
        {/* Mode Selector and Sound Toggle */}
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setMode('countdown');
                handleReset();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'countdown'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'hi' ? 'उलटी गिनती (Countdown)' : 'Countdown'}
            </button>
            <button
              onClick={() => {
                setMode('stopwatch');
                handleReset();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'stopwatch'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'hi' ? 'स्टॉपवॉच (Stopwatch)' : 'Stopwatch'}
            </button>
          </div>

          <button
            onClick={() => setSoundTicking(!soundTicking)}
            className={`p-2 rounded-xl transition-colors ${
              soundTicking
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Tick Sound Toggle"
          >
            {soundTicking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Circular Progress & Digits */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              strokeWidth="6"
              className="text-slate-100 dark:text-slate-800"
              stroke="currentColor"
              fill="none"
            />
            {/* Active progress ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              strokeWidth="6"
              strokeDasharray={`${progressPct * 2.76}, 276`}
              strokeLinecap="round"
              className="text-indigo-600 dark:text-indigo-500 transition-all duration-300"
              stroke="currentColor"
              fill="none"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center space-y-1">
            <span className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
              {timeString}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {mode === 'countdown' ? t.remaining : t.elapsed}
            </span>
            {activeRoutine && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 max-w-[200px] truncate mt-1">
                {activeRoutine.title}
              </span>
            )}
          </div>
        </div>

        {/* Duration presets for countdown */}
        {mode === 'countdown' && !isActive && elapsedSeconds === 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[15, 25, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => handleDurationSelect(mins)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  selectedDurationMins === mins
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {mins} {t.minutes}
              </button>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReset}
            className="p-3 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-2xl transition-colors"
            title={t.reset}
            aria-label="Reset timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleStartPause}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-base shadow-lg shadow-indigo-600/25 flex items-center gap-2 active:scale-95 transition-all"
            aria-label={isActive ? t.pause : t.start}
          >
            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isActive ? t.pause : (elapsedSeconds > 0 ? t.resume : t.start)}</span>
          </button>

          {/* Record & Finish button */}
          {elapsedSeconds > 10 && (
            <button
              onClick={handleFinishAndRecord}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.finishAndRecord}</span>
            </button>
          )}
        </div>

        {/* Completion Celebration Message */}
        {showCompletionBanner && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold animate-in fade-in zoom-in-95">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>{t.sessionFinished}</span>
          </div>
        )}
      </div>
    </div>
  );
};
