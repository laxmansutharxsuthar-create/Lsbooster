export type Language = 'en' | 'hi';
export type Theme = 'dark' | 'light';
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'completed' | 'pending' | 'partial' | 'skipped' | 'missed';

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface RoutineItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  startTime: string; // "HH:MM" 24h
  endTime: string;   // "HH:MM" 24h
  durationMinutes: number;
  priority: Priority;
  recurringDays: number[] | 'daily'; // 0=Sun, 1=Mon, ..., 6=Sat
  subtasks: SubTask[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyRecord {
  id: string;
  routineId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  actualMinutes: number;
  rating: number; // 0 to 5
  notes: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  category: string;
  target: number;
  unit: string;
  history: Record<string, number>; // date -> count
}

export interface Category {
  id: string;
  nameEn: string;
  nameHi: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
  borderColor: string;
  icon: string;
}

export interface UserSettings {
  language: Language;
  theme: Theme;
  notificationsEnabled: boolean;
  leadTimeMinutes: number;
  soundEnabled: boolean;
  morningReminderTime: string;
  eveningReviewTime: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reminder' | 'completion' | 'quote' | 'alert';
}

export interface RoutineTemplate {
  id: string;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  category: string;
  items: Omit<RoutineItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[];
}
