import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Check, CheckCircle2, Clock, Circle, X, AlertCircle, 
  Star, Plus, Edit3 
} from 'lucide-react';
import { RoutineItem, DailyRecord, Language, TaskStatus } from '../types';
import { translations, daysOfWeek, monthsOfYear, daysFull } from '../utils/translations';
import { defaultCategories } from '../data/presetData';

interface CalendarViewProps {
  language: Language;
  routines: RoutineItem[];
  records: Record<string, DailyRecord[]>;
  onUpdateStatusForDate: (date: string, routineId: string, status: TaskStatus) => void;
  onNavigateToRoutineManager: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  language,
  routines,
  records,
  onUpdateStatusForDate,
  onNavigateToRoutineManager,
}) => {
  const t = translations[language];

  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const selectedDateKey = selectedDate.toISOString().slice(0, 10);
  const dayOfWeek = selectedDate.getDay();

  // Routines for the selected date
  const routinesForSelectedDate = routines.filter((r) => {
    if (r.recurringDays === 'daily') return true;
    if (Array.isArray(r.recurringDays)) return r.recurringDays.includes(dayOfWeek);
    return true;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recordsForSelectedDate = records[selectedDateKey] || [];

  // Helper: completion rate for a given date key
  const getDailyCompletionRate = (dateKey: string, dayIdx: number): { rate: number; total: number; completed: number } => {
    const dayRoutines = routines.filter((r) => {
      if (r.recurringDays === 'daily') return true;
      if (Array.isArray(r.recurringDays)) return r.recurringDays.includes(dayIdx);
      return true;
    });

    if (dayRoutines.length === 0) return { rate: 0, total: 0, completed: 0 };

    const dayRecords = records[dateKey] || [];
    let completed = 0;
    dayRecords.forEach((rec) => {
      if (rec.status === 'completed') completed += 1;
      else if (rec.status === 'partial') completed += 0.5;
    });

    const rate = Math.round((completed / dayRoutines.length) * 100);
    return { rate, total: dayRoutines.length, completed };
  };

  // Month navigation calculations
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (currentView === 'day') next.setDate(next.getDate() - 1);
    else if (currentView === 'week') next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setSelectedDate(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (currentView === 'day') next.setDate(next.getDate() + 1);
    else if (currentView === 'week') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header with Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{t.calendar}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {monthsOfYear[language][month]} {year}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['day', 'week', 'month'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  currentView === view
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {view === 'day' ? t.dailyView : view === 'week' ? t.weeklyView : t.monthlyView}
              </button>
            ))}
          </div>

          {/* Date arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
            >
              {t.today}
            </button>
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {currentView === 'month' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center">
            {daysOfWeek[language].map((d) => (
              <div key={d} className="text-xs font-bold text-slate-400 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[80px] p-1 opacity-20" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const dateKey = dateObj.toISOString().slice(0, 10);
              const isSelected = selectedDateKey === dateKey;
              const isToday = new Date().toISOString().slice(0, 10) === dateKey;
              const dayPerf = getDailyCompletionRate(dateKey, dateObj.getDay());

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(dateObj)}
                  className={`min-h-[64px] sm:min-h-[80px] p-2 rounded-2xl flex flex-col justify-between items-start transition-all border text-left ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs'
                      : isToday
                      ? 'border-indigo-300 dark:border-indigo-800 bg-slate-50 dark:bg-slate-800/40'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-bold tabular-nums ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs'
                          : isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayPerf.total > 0 && dayPerf.rate > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        {dayPerf.rate}%
                      </span>
                    )}
                  </div>

                  {/* Performance dot bar */}
                  {dayPerf.total > 0 && (
                    <div className="w-full mt-2">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            dayPerf.rate >= 80
                              ? 'bg-emerald-500'
                              : dayPerf.rate >= 50
                              ? 'bg-amber-500'
                              : 'bg-indigo-400'
                          }`}
                          style={{ width: `${dayPerf.rate}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">
                        {dayPerf.completed}/{dayPerf.total}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {currentView === 'week' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs overflow-x-auto space-y-4">
          <div className="grid grid-cols-7 min-w-[700px] gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const startOfWeek = new Date(selectedDate);
              startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
              const dateKey = startOfWeek.toISOString().slice(0, 10);
              const isSelected = selectedDateKey === dateKey;
              const isToday = new Date().toISOString().slice(0, 10) === dateKey;

              const dayRoutines = routines.filter((r) => {
                if (r.recurringDays === 'daily') return true;
                if (Array.isArray(r.recurringDays)) return r.recurringDays.includes(i);
                return true;
              }).sort((a, b) => a.startTime.localeCompare(b.startTime));

              const dayPerf = getDailyCompletionRate(dateKey, i);

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(startOfWeek)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20'
                  }`}
                >
                  <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500">{daysOfWeek[language][i]}</p>
                    <p className={`text-base font-extrabold ${isToday ? 'text-indigo-600' : 'text-slate-800 dark:text-slate-200'}`}>
                      {startOfWeek.getDate()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{dayPerf.rate}%</p>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    {dayRoutines.map((r) => {
                      const rec = (records[dateKey] || []).find((x) => x.routineId === r.id);
                      const status = rec?.status || 'pending';
                      return (
                        <div
                          key={r.id}
                          className={`p-1.5 rounded-lg text-[11px] truncate font-medium ${
                            status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-75 mr-1">{r.startTime}</span>
                          <span>{r.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Date Routine Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {daysFull[language][dayOfWeek]}, {selectedDate.getDate()} {monthsOfYear[language][month]} {year}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {routinesForSelectedDate.length} {language === 'hi' ? 'गतिविधियां निर्धारित' : 'activities on this date'}
            </p>
          </div>

          <button
            onClick={onNavigateToRoutineManager}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'रूटीन बदलें' : 'Manage Routines'}</span>
          </button>
        </div>

        {routinesForSelectedDate.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            {t.noRoutinesOnDate}
          </p>
        ) : (
          <div className="space-y-2.5">
            {routinesForSelectedDate.map((routine) => {
              const record = recordsForSelectedDate.find((rec) => rec.routineId === routine.id);
              const status: TaskStatus = record?.status || 'pending';
              const cat = defaultCategories.find((c) => c.id === routine.category) || defaultCategories[0];

              return (
                <div
                  key={routine.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-slate-500">
                        {routine.startTime} - {routine.endTime}
                      </p>
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {routine.title}
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateStatusForDate(selectedDateKey, routine.id, status === 'completed' ? 'pending' : 'completed')}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                        status === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600'
                      }`}
                      title={t.completed}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateStatusForDate(selectedDateKey, routine.id, status === 'skipped' ? 'pending' : 'skipped')}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                        status === 'skipped'
                          ? 'bg-slate-700 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600'
                      }`}
                      title={t.skipped}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
