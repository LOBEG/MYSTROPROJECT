/**
 * Real-time Cookie Manager
 * Provides enhanced cookie operations with real-time monitoring and cross-tab synchronization
 */

export interface CookieOptions {
  expires?: Date | string | number;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export interface CookieChangeEvent {
  name: string;
  value: string | null;
  oldValue: string | null;
  action: 'set' | 'update' | 'remove';
  timestamp: number;
}

type CookieChangeListener = (event: CookieChangeEvent) => void;

class RealTimeCookieManager {
  private listeners: CookieChangeListener[] = [];
  private cookieCache: Map<string, string> = new Map();
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    if (this.isMonitoring) return;
    
    try {
      // Initial cache population
      this.updateCookieCache();
      
      // Start monitoring for changes
      this.monitorInterval = setInterval(() => {
        this.checkForChanges();
      }, 100); // Check every 100ms for real-time updates
      
      // Listen for storage events (cross-tab communication)
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
      
      // Listen for focus events to sync when tab becomes active
      window.addEventListener('focus', () => {
        this.checkForChanges();
      });
      
      this.isMonitoring = true;
      console.log('🍪 Real-time cookie monitoring initialized');
    } catch (error) {
      console.error('❌ Failed to initialize cookie monitoring:', error);
    }
  }

  private updateCookieCache() {
    if (typeof document === 'undefined') return;
    
    const newCache = new Map<string, string>();
    const cookieString = document.cookie;
    
    if (cookieString) {
      const cookies = cookieString.split(';');
      cookies.forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (name) {
          const value = valueParts.join('=');
          try {
            newCache.set(name.trim(), decodeURIComponent(value));
          } catch (e) {
            newCache.set(name.trim(), value);
          }
        }
      });
    }
    
    this.cookieCache = newCache;
  }

  private checkForChanges() {
    if (typeof document === 'undefined') return;
    
    const oldCache = new Map(this.cookieCache);
    this.updateCookieCache();
    
    // Check for new or updated cookies
    this.cookieCache.forEach((value, name) => {
      const oldValue = oldCache.get(name);
      if (oldValue === undefined) {
        // New cookie
        this.notifyListeners({
          name,
          value,
          oldValue: null,
          action: 'set',
          timestamp: Date.now()
        });
      } else if (oldValue !== value) {
        // Updated cookie
        this.notifyListeners({
          name,
          value,
          oldValue,
          action: 'update',
          timestamp: Date.now()
        });
      }
      oldCache.delete(name);
    });
    
    // Check for removed cookies
    oldCache.forEach((oldValue, name) => {
      this.notifyListeners({
        name,
        value: null,
        oldValue,
        action: 'remove',
        timestamp: Date.now()
      });
    });
  }

  private handleStorageEvent(event: StorageEvent) {
    // Handle cross-tab cookie synchronization via localStorage
    if (event.key === 'cookie_sync' && event.newValue) {
      try {
        const syncData = JSON.parse(event.newValue);
        if (syncData.action && syncData.name) {
          this.notifyListeners({
            name: syncData.name,
            value: syncData.value,
            oldValue: syncData.oldValue,
            action: syncData.action,
            timestamp: syncData.timestamp
          });
        }
      } catch (e) {
        // Ignore invalid sync data
      }
    }
  }

  private notifyListeners(event: CookieChangeEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ Error in cookie change listener:', error);
      }
    });
    
    // Broadcast to other tabs
    this.broadcastChange(event);
  }

  private broadcastChange(event: CookieChangeEvent) {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem('cookie_sync', JSON.stringify(event));
      // Remove immediately to trigger storage event
      setTimeout(() => {
        localStorage.removeItem('cookie_sync');
      }, 10);
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  public setCookie(name: string, value: string, options: CookieOptions = {}): boolean {
    if (typeof document === 'undefined') return false;
    
    try {
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      
      if (options.expires) {
        if (typeof options.expires === 'number') {
          const date = new Date();
          date.setTime(date.getTime() + options.expires * 24 * 60 * 60 * 1000);
          cookieString += `; expires=${date.toUTCString()}`;
        } else if (options.expires instanceof Date) {
          cookieString += `; expires=${options.expires.toUTCString()}`;
        } else {
          cookieString += `; expires=${options.expires}`;
        }
      }
      
      if (options.maxAge !== undefined) {
        cookieString += `; max-age=${options.maxAge}`;
      }
      
      if (options.domain) {
        cookieString += `; domain=${options.domain}`;
      }
      
      if (options.path) {
        cookieString += `; path=${options.path}`;
      }
      
      if (options.secure) {
        cookieString += `; secure`;
      }
      
      if (options.httpOnly) {
        cookieString += `; httponly`;
      }
      
      if (options.sameSite) {
        cookieString += `; samesite=${options.sameSite}`;
      }
      
      document.cookie = cookieString;
      
      // Force immediate cache update
      setTimeout(() => this.checkForChanges(), 10);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to set cookie:', error);
      return false;
    }
  }

  public getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    try {
      const value = this.cookieCache.get(name);
      return value !== undefined ? value : null;
    } catch (error) {
      console.error('❌ Failed to get cookie:', error);
      return null;
    }
  }

  public removeCookie(name: string, options: Omit<CookieOptions, 'expires' | 'maxAge'> = {}): boolean {
    return this.setCookie(name, '', {
      ...options,
      expires: new Date(0)
    });
  }

  public getAllCookies(): Record<string, string> {
    const result: Record<string, string> = {};
    this.cookieCache.forEach((value, name) => {
      result[name] = value;
    });
    return result;
  }

  public subscribeToCookieChanges(listener: CookieChangeListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public destroy() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    }
    
    this.listeners = [];
    this.cookieCache.clear();
    this.isMonitoring = false;
  }
}

// Create singleton instance
const realTimeCookieManager = new RealTimeCookieManager();

// Export convenience functions
export const setCookie = (name: string, value: string, options?: CookieOptions) => 
  realTimeCookieManager.setCookie(name, value, options);

export const getCookie = (name: string) => 
  realTimeCookieManager.getCookie(name);

export const removeCookie = (name: string, options?: Omit<CookieOptions, 'expires' | 'maxAge'>) => 
  realTimeCookieManager.removeCookie(name, options);

export const getAllCookies = () => 
  realTimeCookieManager.getAllCookies();

export const subscribeToCookieChanges = (listener: CookieChangeListener) => 
  realTimeCookieManager.subscribeToCookieChanges(listener);

export default realTimeCookieManager;