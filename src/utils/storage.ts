import { Goal, RoutineItem, DailyRecord, UserProfile, UserSettings } from '../types';

const TOKEN_KEY = 'mlm_auth_token';
const USER_KEY = 'mlm_current_user';
const LOCAL_ROUTINES_KEY = 'mlm_local_routines';
const LOCAL_RECORDS_KEY = 'mlm_local_records';
const LOCAL_GOALS_KEY = 'mlm_local_goals';
const LOCAL_SETTINGS_KEY = 'mlm_local_settings';

export const storageService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getUser(): UserProfile | null {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  setUser(user: UserProfile) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Local storage fallbacks
  getLocalRoutines(): RoutineItem[] {
    try {
      const d = localStorage.getItem(LOCAL_ROUTINES_KEY);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },

  setLocalRoutines(routines: RoutineItem[]) {
    localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(routines));
  },

  getLocalRecords(): Record<string, DailyRecord[]> {
    try {
      const d = localStorage.getItem(LOCAL_RECORDS_KEY);
      return d ? JSON.parse(d) : {};
    } catch {
      return {};
    }
  },

  setLocalRecords(records: Record<string, DailyRecord[]>) {
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
  },

  getLocalGoals(): Goal[] {
    try {
      const d = localStorage.getItem(LOCAL_GOALS_KEY);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  },

  setLocalGoals(goals: Goal[]) {
    localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(goals));
  },

  getLocalSettings(): UserSettings {
    try {
      const d = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (d) return JSON.parse(d);
    } catch {
      // fallback
    }
    return {
      language: 'en',
      theme: 'dark',
      notificationsEnabled: true,
      leadTimeMinutes: 10,
      soundEnabled: true,
      morningReminderTime: '06:30',
      eveningReviewTime: '21:30',
    };
  },

  setLocalSettings(settings: UserSettings) {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  },

  // API Calls
  async fetchRemoteData(): Promise<{
    routines: RoutineItem[];
    records: Record<string, DailyRecord[]>;
    goals: Goal[];
    settings: UserSettings;
  } | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        this.setLocalRoutines(data.routines || []);
        this.setLocalRecords(data.records || {});
        this.setLocalGoals(data.goals || []);
        if (data.settings) this.setLocalSettings(data.settings);
        return data;
      }
    } catch (err) {
      console.warn('Could not fetch from server, using local data', err);
    }
    return null;
  },

  async syncWithRemote(data: {
    routines: RoutineItem[];
    records: Record<string, DailyRecord[]>;
    goals: Goal[];
    settings: UserSettings;
  }): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (err) {
      console.warn('Sync failed', err);
      return false;
    }
  },

  async downloadBackup(): Promise<void> {
    const token = this.getToken();
    let url = '/api/backup';
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `my-life-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
    } catch {
      // Local backup fallback
    }

    // Fallback: export local data
    const localBackup = {
      appName: 'My Life Manager – Daily Routine',
      exportedAt: new Date().toISOString(),
      routines: this.getLocalRoutines(),
      records: this.getLocalRecords(),
      goals: this.getLocalGoals(),
      settings: this.getLocalSettings(),
    };
    const blob = new Blob([JSON.stringify(localBackup, null, 2)], { type: 'application/json' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `my-life-manager-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async restoreFromFile(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.routines) this.setLocalRoutines(parsed.routines);
      if (parsed.records) this.setLocalRecords(parsed.records);
      if (parsed.goals) this.setLocalGoals(parsed.goals);
      if (parsed.settings) this.setLocalSettings(parsed.settings);

      const token = this.getToken();
      if (token) {
        await fetch('/api/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: text,
        });
      }
      return true;
    } catch (err) {
      console.error('Restore error:', err);
      return false;
    }
  },
};
