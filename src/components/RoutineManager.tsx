import React, { useState } from 'react';
import { 
  Plus, Edit3, Trash2, ArrowUp, ArrowDown, Clock, 
  Calendar, Check, AlertCircle, Sparkles, BookOpen, 
  Dumbbell, Briefcase, Utensils, MoonStar, Gamepad2, Heart, CheckSquare, Users
} from 'lucide-react';
import { RoutineItem, Language, Priority, SubTask } from '../types';
import { translations, daysOfWeek } from '../utils/translations';
import { defaultCategories, routineTemplates } from '../data/presetData';

interface RoutineManagerProps {
  language: Language;
  routines: RoutineItem[];
  onAddRoutine: (routine: Omit<RoutineItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateRoutine: (routine: RoutineItem) => void;
  onDeleteRoutine: (id: string) => void;
  onReorderRoutines: (reordered: RoutineItem[]) => void;
  onApplyTemplate: (templateId: string) => void;
}

export const RoutineManager: React.FC<RoutineManagerProps> = ({
  language,
  routines,
  onAddRoutine,
  onUpdateRoutine,
  onDeleteRoutine,
  onReorderRoutines,
  onApplyTemplate,
}) => {
  const t = translations[language];

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('work');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isDaily, setIsDaily] = useState<boolean>(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const calculateDuration = (start: string, end: string): number => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60; // handles overnight tasks like sleep
    return diff;
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setCategory('work');
    setStartTime('09:00');
    setEndTime('10:00');
    setPriority('medium');
    setIsDaily(true);
    setSelectedDays([1, 2, 3, 4, 5]);
    setSubtasks([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: RoutineItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setPriority(item.priority);
    setIsDaily(item.recurringDays === 'daily');
    setSelectedDays(Array.isArray(item.recurringDays) ? item.recurringDays : [0, 1, 2, 3, 4, 5, 6]);
    setSubtasks(item.subtasks || []);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError(language === 'hi' ? 'कृपया गतिविधि का नाम लिखें' : 'Please enter an activity title');
      return;
    }

    const durationMinutes = calculateDuration(startTime, endTime);
    const recurringDays = isDaily ? 'daily' : selectedDays;

    if (editingItem) {
      onUpdateRoutine({
        ...editingItem,
        title: title.trim(),
        description: description.trim(),
        category,
        startTime,
        endTime,
        durationMinutes,
        priority,
        recurringDays,
        subtasks,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddRoutine({
        title: title.trim(),
        description: description.trim(),
        category,
        startTime,
        endTime,
        durationMinutes,
        priority,
        recurringDays,
        subtasks,
        order: routines.length + 1,
      });
    }

    setIsModalOpen(false);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSubtasks([
      ...subtasks,
      { id: 'st_' + Date.now(), text: newSubtaskInput.trim(), completed: false },
    ]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
      }
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  // Reordering helpers
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= routines.length) return;

    const copy = [...routines];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    onReorderRoutines(copy);
  };

  const handleSortByTime = () => {
    const sorted = [...routines].sort((a, b) => a.startTime.localeCompare(b.startTime));
    onReorderRoutines(sorted);
  };

  // Filtered routines
  const filteredRoutines = routines.filter((r) => {
    if (selectedCategoryFilter === 'all') return true;
    return r.category === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t.routines}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'hi'
              ? 'अपनी नियमित गतिविधियों को जोड़ें, संपादित करें और दैनिक प्राथमिकताएं तय करें।'
              : 'Configure your recurring activities, schedule time blocks, and set priorities.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.applyTemplate}</span>
          </button>

          <button
            onClick={handleSortByTime}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
            title={t.sortByTime}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.sortByTime}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addActivity}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategoryFilter === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          {t.allCategories} ({routines.length})
        </button>
        {defaultCategories.map((c) => {
          const count = routines.filter((r) => r.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryFilter(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategoryFilter === c.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'hi' ? c.nameHi : c.nameEn} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Routine List */}
      {filteredRoutines.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {language === 'hi' ? 'इस श्रेणी में कोई गतिविधि नहीं मिली।' : 'No activities found in this filter.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            {t.addNewActivity}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRoutines.map((routine, idx) => {
            const categoryObj = defaultCategories.find((c) => c.id === routine.category) || defaultCategories[0];
            const categoryName = language === 'hi' ? categoryObj.nameHi : categoryObj.nameEn;

            return (
              <div
                key={routine.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all shadow-xs hover:border-slate-300"
              >
                {/* Left info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${categoryObj.color}15`, color: categoryObj.color }}
                  >
                    <Clock className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {routine.startTime} – {routine.endTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{routine.durationMinutes} {t.minutes}</span>
                      <span aria-hidden="true">·</span>
                      <span style={{ color: categoryObj.color }} className="font-medium">
                        {categoryName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${
                        routine.priority === 'high' ? 'text-rose-600 dark:text-rose-400' :
                        routine.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                        'text-slate-500'
                      }`}>
                        {routine.priority === 'high' ? t.high : routine.priority === 'medium' ? t.medium : t.low}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {routine.title}
                    </h4>

                    {routine.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-lg">
                        {routine.description}
                      </p>
                    )}

                    {/* Recurring Days Indicator */}
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-slate-400">
                      <span>
                        {routine.recurringDays === 'daily'
                          ? t.repeatEveryday
                          : (routine.recurringDays as number[]).map((d) => daysOfWeek[language][d]).join(', ')}
                      </span>
                      {routine.subtasks && routine.subtasks.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{routine.subtasks.length} {t.subtasksLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Reorder Buttons */}
                  <div className="hidden sm:flex flex-col">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                      title={t.moveUp}
                      aria-label="Move routine up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === routines.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                      title={t.moveDown}
                      aria-label="Move routine down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => handleOpenEditModal(routine)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title={t.editActivity}
                    aria-label="Edit routine"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      if (window.confirm(t.confirmDelete)) {
                        onDeleteRoutine(routine.id);
                      }
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                    title={t.delete}
                    aria-label="Delete routine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingItem ? t.editActivity : t.addNewActivity}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.titleLabel} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.categoryLabel}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {defaultCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'hi' ? c.nameHi : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.priority}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="high">{t.high}</option>
                    <option value="medium">{t.medium}</option>
                    <option value="low">{t.low}</option>
                  </select>
                </div>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.startTimeLabel}
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.endTimeLabel}
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>{t.durationLabel}:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {calculateDuration(startTime, endTime)} {t.minutes}
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.descriptionLabel}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descriptionPlaceholder}
                  rows={2}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Recurring Settings */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.recurringDaysLabel}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={isDaily}
                      onChange={() => setIsDaily(true)}
                      className="text-indigo-600"
                    />
                    <span>{t.repeatEveryday}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isDaily}
                      onChange={() => setIsDaily(false)}
                      className="text-indigo-600"
                    />
                    <span>{t.customDays}</span>
                  </label>
                </div>

                {!isDaily && (
                  <div className="grid grid-cols-7 gap-1 pt-1">
                    {daysOfWeek[language].map((dayName, idx) => {
                      const isSelected = selectedDays.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`h-9 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subtasks / Checklist */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.subtasksLabel}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    placeholder="e.g. Anulom Vilom for 10 min"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200"
                  >
                    {t.addSubtask}
                  </button>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg text-xs"
                      >
                        <span className="text-slate-700 dark:text-slate-300">{st.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20"
                >
                  {editingItem ? t.updateActivity : t.saveActivity}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Routine Templates Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{language === 'hi' ? 'पूर्व-निर्मित दिनचर्या टेम्पलेट्स' : 'Pre-Built Routine Templates'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'hi'
                    ? 'अपनी आवश्यकता अनुसार एक संपूर्ण दिनचर्या चुनें और एक क्लिक में लोड करें।'
                    : 'Choose an expert-curated routine framework to kickstart your day immediately.'}
                </p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {routineTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all space-y-3 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {language === 'hi' ? template.nameHi : template.nameEn}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {language === 'hi' ? template.descriptionHi : template.descriptionEn}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onApplyTemplate(template.id);
                        setIsTemplateModalOpen(false);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs shrink-0"
                    >
                      {language === 'hi' ? 'लागू करें' : 'Apply'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    {template.items.map((it, i) => (
                      <span key={i} className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        {it.startTime} · {it.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
