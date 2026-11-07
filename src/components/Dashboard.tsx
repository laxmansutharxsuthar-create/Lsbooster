import React, { useState } from 'react';
import { 
  CheckCircle2, Circle, Clock, Flame, Play, AlertCircle, 
  Star, ChevronDown, ChevronUp, Quote, Sparkles, Plus, 
  Minus, Check, X, RefreshCw, Award, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { RoutineItem, DailyRecord, Language, TaskStatus, Goal, UserProfile } from '../types';
import { translations, daysFull, monthsOfYear } from '../utils/translations';
import { defaultCategories, motivationalQuotes } from '../data/presetData';

interface DashboardProps {
  language: Language;
  user: UserProfile | null;
  routines: RoutineItem[];
  todayRecords: DailyRecord[];
  yesterdayRecords: DailyRecord[];
  goals: Goal[];
  onUpdateTaskStatus: (routineId: string, status: TaskStatus) => void;
  onUpdateTaskRating: (routineId: string, rating: number) => void;
  onUpdateTaskNotes: (routineId: string, notes: string) => void;
  onUpdateGoalProgress: (goalId: string, delta: number) => void;
  onStartFocusTimer: (routine: RoutineItem) => void;
  onNavigateToRoutineManager: () => void;
  onNavigateToTemplates: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  language,
  user,
  routines,
  todayRecords,
  yesterdayRecords,
  goals,
  onUpdateTaskStatus,
  onUpdateTaskRating,
  onUpdateTaskNotes,
  onUpdateGoalProgress,
  onStartFocusTimer,
  onNavigateToRoutineManager,
  onNavigateToTemplates,
}) => {
  const t = translations[language];
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState<string>('');
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Dynamic Greeting
  const hour = now.getHours();
  let greeting = t.greetingMorning;
  if (hour >= 12 && hour < 17) greeting = t.greetingAfternoon;
  else if (hour >= 17 && hour < 21) greeting = t.greetingEvening;
  else if (hour >= 21 || hour < 5) greeting = t.greetingNight;

  // Filter routines scheduled for today
  const todayRoutines = routines.filter((r) => {
    if (r.recurringDays === 'daily') return true;
    if (Array.isArray(r.recurringDays)) return r.recurringDays.includes(dayOfWeek);
    return true;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Map routine to record
  const getRecord = (routineId: string): DailyRecord | undefined => {
    return todayRecords.find((rec) => rec.routineId === routineId);
  };

  // Stats calculation
  const totalTasks = todayRoutines.length;
  let completedCount = 0;
  let partialCount = 0;
  let skippedCount = 0;
  let missedCount = 0;
  let pendingCount = 0;

  todayRoutines.forEach((r) => {
    const rec = getRecord(r.id);
    const status = rec?.status || 'pending';

    // Auto-detect missed if time has passed and not finished
    const [endH, endM] = r.endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    const isPast = currentMinutes > endMinutes;

    if (status === 'completed') completedCount++;
    else if (status === 'partial') partialCount++;
    else if (status === 'skipped') skippedCount++;
    else if (status === 'missed' || (status === 'pending' && isPast)) {
      missedCount++;
    } else {
      pendingCount++;
    }
  });

  const completionPercentage = totalTasks > 0 ? Math.round(((completedCount + partialCount * 0.5) / totalTasks) * 100) : 0;

  // Yesterday comparison
  let yesterdayCompleted = 0;
  yesterdayRecords.forEach((r) => {
    if (r.status === 'completed') yesterdayCompleted++;
  });
  const yesterdayTotal = yesterdayRecords.length || 1;
  const yesterdayPercentage = Math.round((yesterdayCompleted / yesterdayTotal) * 100);
  const diffFromYesterday = completionPercentage - yesterdayPercentage;

  // Formatted date
  const dayName = daysFull[language][dayOfWeek];
  const monthName = monthsOfYear[language][now.getMonth()];
  const formattedDate = `${dayName}, ${now.getDate()} ${monthName} ${now.getFullYear()}`;

  // Current active quote
  const currentQuote = motivationalQuotes[quoteIndex % motivationalQuotes.length];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Hero Welcome & Date Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs sm:text-sm font-semibold tracking-wide">
              <span>{formattedDate}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {greeting}, {user ? user.name.split(' ')[0] : (language === 'hi' ? 'दोस्त' : 'Champion')}!
            </h2>

            <p className="text-slate-300 text-sm max-w-xl">
              {completionPercentage >= 80
                ? (language === 'hi' ? 'अद्भुत गति! आज आपका अनुशासन और ध्यान प्रेरणादायक है।' : 'Incredible momentum! Your discipline today is inspiring.')
                : completionPercentage >= 40
                ? (language === 'hi' ? 'शानदार प्रगति! अगले कार्य पर ध्यान केंद्रित करें।' : 'Great progress underway! Keep moving step-by-step through your plan.')
                : (language === 'hi' ? 'अपनी प्राथमिकताओं के साथ दिन की मजबूत शुरुआत करें।' : 'Own the day! Execute your top priorities with clarity and focus.')}
            </p>
          </div>

          {/* Daily Circular Score Ring */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 shrink-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-700 ease-out"
                  strokeDasharray={`${completionPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-lg sm:text-xl font-bold tabular-nums leading-none">
                  {completionPercentage}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t.dailyScore}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {diffFromYesterday >= 0 ? (
                  <span className="flex items-center text-xs font-bold text-emerald-300">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    +{diffFromYesterday}%
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold text-rose-300">
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    {diffFromYesterday}%
                  </span>
                )}
                <span className="text-[11px] text-slate-400">{t.vsYesterday}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl transition-colors shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.totalTasks}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {totalTasks}
            </span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {todayRoutines.reduce((acc, curr) => acc + curr.durationMinutes, 0)} {t.minutes}
            </span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl transition-colors shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t.completed}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {completedCount}
            </span>
            <span className="text-xs text-slate-400">
              {totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl transition-colors shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t.pending}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              {pendingCount}
            </span>
            <span className="text-xs text-slate-400">
              {partialCount > 0 ? `${partialCount} ${t.partiallyDone}` : `${pendingCount} left`}
            </span>
          </div>
        </div>

        {/* Missed / Skipped */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl transition-colors shadow-xs">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{t.missed}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
              {missedCount}
            </span>
            <span className="text-xs text-slate-400">
              {skippedCount} {t.skipped}
            </span>
          </div>
        </div>
      </div>

      {/* Routine Timeline & Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Today's Routine Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.todayTimeline}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {todayRoutines.length} {language === 'hi' ? 'गतिविधियां निर्धारित' : 'scheduled activities for today'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateToRoutineManager}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addActivity}</span>
              </button>
            </div>
          </div>

          {todayRoutines.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.noTasksToday}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'hi'
                    ? 'आप एक क्लिक में छात्र, फिटनेस या कार्य दिवस का बना-बनाया रूटीन चुन सकते हैं।'
                    : 'Get started instantly by applying a pre-configured routine template or creating your own custom schedule.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={onNavigateToTemplates}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  {t.applyTemplate}
                </button>
                <button
                  onClick={onNavigateToRoutineManager}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  {t.addActivity}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todayRoutines.map((routine) => {
                const record = getRecord(routine.id);
                const status: TaskStatus = record?.status || 'pending';
                const rating = record?.rating || 0;
                const actualMinutes = record?.actualMinutes || 0;
                const notes = record?.notes || '';
                const isExpanded = expandedTaskId === routine.id;

                const category = defaultCategories.find((c) => c.id === routine.category) || defaultCategories[0];
                const categoryName = language === 'hi' ? category.nameHi : category.nameEn;

                // Time math for active highlight
                const [startH, startM] = routine.startTime.split(':').map(Number);
                const [endH, endM] = routine.endTime.split(':').map(Number);
                const startMins = startH * 60 + startM;
                const endMins = endH * 60 + endM;
                const isCurrentActive = currentMinutes >= startMins && currentMinutes <= endMins;
                const isPast = currentMinutes > endMins;
                const isAutoMissed = status === 'pending' && isPast;

                return (
                  <div
                    key={routine.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-xs overflow-hidden ${
                      isCurrentActive
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:ring-indigo-500/30'
                        : isAutoMissed
                        ? 'border-rose-300 dark:border-rose-900/50'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Top colored hairline strip */}
                    <div className="h-1 w-full" style={{ backgroundColor: category.color }} />

                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        {/* Time & Title info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {/* Unboxed clean metadata (Zero-Pill discipline) */}
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {routine.startTime} – {routine.endTime}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{routine.durationMinutes} {t.minutes}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium" style={{ color: category.color }}>
                              {categoryName}
                            </span>
                            {routine.priority === 'high' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  {t.high}
                                </span>
                              </>
                            )}
                            {isCurrentActive && (
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {language === 'hi' ? '● चालू है' : '● In Progress'}
                              </span>
                            )}
                          </div>

                          <h4 className={`text-base font-bold text-slate-900 dark:text-white truncate ${
                            status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}>
                            {routine.title}
                          </h4>

                          {routine.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {routine.description}
                            </p>
                          )}
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Completed Toggle */}
                          <button
                            onClick={() => onUpdateTaskStatus(routine.id, status === 'completed' ? 'pending' : 'completed')}
                            className={`p-2 rounded-xl transition-all ${
                              status === 'completed'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                            title={t.completed}
                            aria-label="Mark task completed"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          {/* Partially Done */}
                          <button
                            onClick={() => onUpdateTaskStatus(routine.id, status === 'partial' ? 'pending' : 'partial')}
                            className={`p-2 rounded-xl transition-all ${
                              status === 'partial'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                            title={t.partiallyDone}
                            aria-label="Mark task partially completed"
                          >
                            <Circle className="w-4 h-4 fill-current opacity-60" />
                          </button>

                          {/* Skipped */}
                          <button
                            onClick={() => onUpdateTaskStatus(routine.id, status === 'skipped' ? 'pending' : 'skipped')}
                            className={`p-2 rounded-xl transition-all ${
                              status === 'skipped'
                                ? 'bg-slate-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                            }`}
                            title={t.skipped}
                            aria-label="Mark task skipped"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Focus Timer Trigger */}
                          <button
                            onClick={() => onStartFocusTimer(routine)}
                            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                            title={t.startTimer}
                            aria-label="Start focus timer"
                          >
                            <Play className="w-4 h-4" />
                          </button>

                          {/* Expand Details */}
                          <button
                            onClick={() => setExpandedTaskId(isExpanded ? null : routine.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Details: Subtasks, Time Spent, Notes, Rating */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                          {/* Subtasks Checklist */}
                          {routine.subtasks && routine.subtasks.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {t.subtasksLabel}
                              </p>
                              <div className="space-y-1">
                                {routine.subtasks.map((st) => (
                                  <div key={st.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <span>{st.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Performance Rating and Actual Time */}
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                            {/* 1-5 Star Self Rating */}
                            <div>
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                {t.ratePerformance}
                              </p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => onUpdateTaskRating(routine.id, star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                    aria-label={`Rate ${star} stars`}
                                  >
                                    <Star
                                      className={`w-4 h-4 ${
                                        star <= rating
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-slate-300 dark:text-slate-600'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Actual Minutes Logged */}
                            {actualMinutes > 0 && (
                              <div className="text-right">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                  {t.actualTimeSpent}
                                </p>
                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                  {actualMinutes} {t.minutes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Quick Notes */}
                          <div>
                            {editingNotesId === routine.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={tempNote}
                                  onChange={(e) => setTempNote(e.target.value)}
                                  placeholder={t.notesPlaceholder}
                                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  rows={2}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      onUpdateTaskNotes(routine.id, tempNote);
                                      setEditingNotesId(null);
                                    }}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                                  >
                                    {t.saveNotes}
                                  </button>
                                  <button
                                    onClick={() => setEditingNotesId(null)}
                                    className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs"
                                  >
                                    {t.cancel}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <p className="italic line-clamp-2">
                                  {notes || (language === 'hi' ? 'कोई नोट नहीं जुड़ा है' : 'No performance note recorded')}
                                </p>
                                <button
                                  onClick={() => {
                                    setTempNote(notes);
                                    setEditingNotesId(routine.id);
                                  }}
                                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0 ml-2"
                                >
                                  {notes ? (language === 'hi' ? 'संपादित करें' : 'Edit') : (language === 'hi' ? '+ नोट लिखें' : '+ Add Note')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Daily Goals & Motivational Quote */}
        <div className="space-y-6">
          {/* Daily Personal Goals */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{t.personalDailyGoals}</span>
              </h3>
            </div>

            <div className="space-y-3">
              {goals.map((g) => {
                const todayKey = now.toISOString().slice(0, 10);
                const currentVal = g.history[todayKey] || 0;
                const progressPct = Math.min(100, Math.round((currentVal / g.target) * 100));

                return (
                  <div key={g.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{g.title}</span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {currentVal} / {g.target} {g.unit}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {progressPct}% {language === 'hi' ? 'पूरा' : 'reached'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateGoalProgress(g.id, -1)}
                          disabled={currentVal <= 0}
                          className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40"
                          aria-label="Decrement goal"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onUpdateGoalProgress(g.id, 1)}
                          className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500"
                          aria-label="Increment goal"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Motivational Quote Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-3xl p-5 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Quote className="w-3.5 h-3.5" />
                <span>{t.dailyQuote}</span>
              </span>
              <button
                onClick={() => setQuoteIndex((prev) => prev + 1)}
                className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                title={t.nextQuote}
                aria-label="Next quote"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed italic">
              "{language === 'hi' ? currentQuote.quoteHi : currentQuote.quoteEn}"
            </p>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">
              — {language === 'hi' ? currentQuote.authorHi : currentQuote.authorEn}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
