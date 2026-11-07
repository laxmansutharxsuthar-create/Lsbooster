import { AppNotification } from '../types';
import { soundManager } from './audio';

export class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: ((notifications: AppNotification[]) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('mlm_notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
      }
    } catch {
      this.notifications = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('mlm_notifications', JSON.stringify(this.notifications.slice(0, 30)));
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  subscribe(listener: (notifications: AppNotification[]) => void) {
    this.listeners.push(listener);
    listener([...this.notifications]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l([...this.notifications]));
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  isPermissionGranted(): boolean {
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  notify(title: string, message: string, type: AppNotification['type'] = 'reminder', playAudio = true) {
    const newNotif: AppNotification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type,
    };

    this.notifications.unshift(newNotif);
    this.saveToStorage();

    if (playAudio) {
      if (type === 'completion') {
        soundManager.playSuccessFanfare();
      } else {
        soundManager.playChime();
      }
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }
  }

  markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.saveToStorage();
  }

  clearAll() {
    this.notifications = [];
    this.saveToStorage();
  }

  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }
}

export const notificationService = new NotificationService();
