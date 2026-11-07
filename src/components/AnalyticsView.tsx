import React, { useState } from 'react';
import { 
  BarChart3, TrendingUp, Award, Clock, AlertTriangle, 
  Sparkles, CheckCircle2, XCircle, Calendar, ArrowUpRight 
} from 'lucide-react';
import { RoutineItem, DailyRecord, Language } from '../types';
import { translations, daysOfWeek } from '../utils/translations';
import { defaultCategories } from '../data/presetData';

interface AnalyticsViewProps {
  language: Language;
  routines: RoutineItem[];
  records: Record<string, DailyRecord[]>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  language,
  routines,
  records,
}) => {
  const t = translations[language];
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  const today = new Date();

  // Generate date array for 7d or 30d
  const numDays = timeRange === '7d' ? 7 : 30;
  const dates: { dateKey: string; label: string; dayIndex: number }[] = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    dates.push({ dateKey, label, dayIndex: d.getDay() });
  }

  // Calculate stats over dates
  let totalScheduled = 0;
  let totalCompleted = 0;
  let totalPartial = 0;
  let totalSkipped = 0;
  let totalMissed = 0;
  let totalMinutesSpent = 0;

  // Day of week productivity counter: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  const dayStats: { completed: number; total: number }[] = Array.from({ length: 7 }, () => ({ completed: 0, total: 0 }));

  // Category time accumulator
  const categoryMinutes: Record<string, number> = {};
  defaultCategories.forEach((c) => {
    categoryMinutes[c.id] = 0;
  });

  const dailyTrendData = dates.map(({ dateKey, label, dayIndex }) => {
    const dayRoutines = routines.filter((r) => {
      if (r.recurringDays === 'daily') return true;
      if (Array.isArray(r.recurringDays)) return r.recurringDays.includes(dayIndex);
      return true;
    });

    const dayRecords = records[dateKey] || [];
    let completed = 0;
    let partial = 0;
    let skipped = 0;
    let missed = 0;

    dayRoutines.forEach((r) => {
      const rec = dayRecords.find((x) => x.routineId === r.id);
      const status = rec?.status || 'pending';
      const actual = rec?.actualMinutes || r.durationMinutes;

      if (status === 'completed') {
        completed++;
        totalMinutesSpent += actual;
        categoryMinutes[r.category] = (categoryMinutes[r.category] || 0) + actual;
      } else if (status === 'partial') {
        partial++;
        totalMinutesSpent += Math.round(actual * 0.5);
        categoryMinutes[r.category] = (categoryMinutes[r.category] || 0) + Math.round(actual * 0.5);
      } else if (status === 'skipped') {
        skipped++;
      } else {
        missed++;
      }
    });

    totalScheduled += dayRoutines.length;
    totalCompleted += completed;
    totalPartial += partial;
    totalSkipped += skipped;
    totalMissed += missed;

    dayStats[dayIndex].completed += completed;
    dayStats[dayIndex].total += dayRoutines.length;

    const rate = dayRoutines.length > 0 ? Math.round(((completed + partial * 0.5) / dayRoutines.length) * 100) : 0;
    return { dateKey, label, rate, completed, total: dayRoutines.length };
  });

  // Overall completion score (0-100)
  const overallRate = totalScheduled > 0 ? Math.round(((totalCompleted + totalPartial * 0.5) / totalScheduled) * 100) : 0;

  // Grade calculation
  let grade = 'A+';
  if (overallRate < 60) grade = 'C';
  else if (overallRate < 75) grade = 'B';
  else if (overallRate < 90) grade = 'A';

  // Most productive day of the week
  let bestDayIdx = 3; // Wednesday fallback
  let highestRatio = -1;
  dayStats.forEach((ds, idx) => {
    if (ds.total > 0) {
      const ratio = ds.completed / ds.total;
      if (ratio > highestRatio) {
        highestRatio = ratio;
        bestDayIdx = idx;
      }
    }
  });

  const bestDayName = daysOfWeek[language][bestDayIdx];

  // Smart suggestions list based on actual stats
  const suggestions = [
    {
      titleEn: 'Protect Morning Golden Hours',
      titleHi: 'सुबह के सुनहरे समय की सुरक्षा करें',
      descEn: 'Your energy levels and task completion rates peak in the morning. Group your hardest tasks before 11 AM.',
      descHi: 'आपका फोकस सुबह के समय उच्चतम रहता है। अपने सबसे कठिन कार्य 11 AM से पहले पूरे करने का लक्ष्य रखें।',
    },
    {
      titleEn: 'Eliminate Afternoon Energy Dips',
      titleHi: 'दोपहर की सुस्ती से बचें',
      descEn: 'Add a 15-minute hydration break and brisk outdoor walk around 3 PM to reset your cognitive rhythm.',
      descHi: 'दोपहर 3 बजे 15 मिनट टहलें और पानी पिएं जिससे मानसिक थकान दूर होकर ऊर्जा बनी रहे।',
    },
    {
      titleEn: 'Digital Screen Curfew',
      titleHi: 'सोने से पहले स्क्रीन बंद करें',
      descEn: 'Shut down blue-light emitting devices 30 minutes before sleep for deeper REM rest and sharp morning alertness.',
      descHi: 'सोने से आधा घंटा पहले मोबाइल और लैपटॉप बंद करने से गहरी नींद आती है और अगली सुबह उत्साह रहता है।',
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{t.performanceAnalytics}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'hi'
              ? 'समय प्रबंधन, पूर्णता दर और उत्पादकता रिपोर्ट का गहरा विश्लेषण।'
              : 'Actionable metrics on consistency, time allocation, and habits.'}
          </p>
        </div>

        {/* Range Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeRange === '7d'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'hi' ? 'पिछले 7 दिन' : 'Last 7 Days'}
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeRange === '30d'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'hi' ? 'पिछले 30 दिन' : 'Last 30 Days'}
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.dailyScore}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {overallRate}%
            </span>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md font-mono font-bold text-xs">
              {grade}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t.completed}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalCompleted}
            </span>
            <span className="text-xs text-slate-400">
              {totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{t.missed}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
              {totalMissed}
            </span>
            <span className="text-xs text-slate-400">
              {totalSkipped} {t.skipped}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t.mostProductiveDay}</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {bestDayName}
            </span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Daily Performance Trend Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{timeRange === '7d' ? t.weeklyTrend : t.dailyTrend}</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {timeRange === '7d' ? 'Past 7 Days' : 'Past 30 Days'}
          </span>
        </div>

        {/* Responsive Interactive SVG Bar Graph */}
        <div className="h-56 w-full flex items-end gap-1.5 sm:gap-3 pt-6 pb-2 px-2">
          {dailyTrendData.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md pointer-events-none whitespace-nowrap z-20 shadow-md font-mono">
                {item.label}: {item.rate}% ({item.completed}/{item.total})
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-full flex items-end overflow-hidden">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    item.rate >= 80
                      ? 'bg-emerald-500'
                      : item.rate >= 50
                      ? 'bg-indigo-600'
                      : 'bg-amber-400'
                  }`}
                  style={{ height: `${Math.max(6, item.rate)}%` }}
                />
              </div>

              {/* Bottom label */}
              <span className="text-[10px] sm:text-xs text-slate-400 font-mono mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Time Management Report & Smart Suggestions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Spent by Category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t.timeManagementReport}</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {Math.round(totalMinutesSpent / 60)} {t.hours} logged
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {defaultCategories.map((cat) => {
              const mins = categoryMinutes[cat.id] || 0;
              const hours = (mins / 60).toFixed(1);
              const percentage = totalMinutesSpent > 0 ? Math.round((mins / totalMinutesSpent) * 100) : 0;
              const catName = language === 'hi' ? cat.nameHi : cat.nameEn;

              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{catName}</span>
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {hours} {t.hours} ({percentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productivity Improvement Suggestions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t.smartSuggestions}</span>
            </h3>
          </div>

          <div className="space-y-3">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1"
              >
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-mono">
                    {idx + 1}
                  </span>
                  <span>{language === 'hi' ? s.titleHi : s.titleEn}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
                  {language === 'hi' ? s.descHi : s.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
