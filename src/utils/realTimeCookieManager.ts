/**
 * Real-time Cookie Manager
 * Provides cross-tab cookie synchronization and real-time updates
 */

export interface CookieOptions {
  expires?: Date | string | number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
}

export interface CookieChangeEvent {
  name: string;
  value: string | null;
  action: 'set' | 'update' | 'remove';
  timestamp: string;
}

type CookieChangeListener = (event: CookieChangeEvent) => void;

class RealTimeCookieManager {
  private listeners: CookieChangeListener[] = [];
  private cookieCache: Map<string, string> = new Map();
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;
    
    // Initialize cookie cache
    this.updateCacheFromDocument();
    
    // Set up polling for cookie changes (fallback)
    setInterval(() => {
      this.checkForChanges();
    }, 1000);

    // Listen for storage events (cross-tab communication)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key?.startsWith('cookie_change_')) {
          try {
            const changeEvent: CookieChangeEvent = JSON.parse(event.newValue || '{}');
            this.notifyListeners(changeEvent);
          } catch (e) {
            // Ignore invalid events
          }
        }
      });
    }

    this.isInitialized = true;
  }

  private updateCacheFromDocument() {
    if (typeof document === 'undefined') return;
    
    const cookies = this.parseCookieString(document.cookie);
    this.cookieCache.clear();
    
    Object.entries(cookies).forEach(([name, value]) => {
      this.cookieCache.set(name, value);
    });
  }

  private checkForChanges() {
    if (typeof document === 'undefined') return;
    
    const currentCookies = this.parseCookieString(document.cookie);
    const currentNames = new Set(Object.keys(currentCookies));
    const cachedNames = new Set(this.cookieCache.keys());

    // Check for new or updated cookies
    Object.entries(currentCookies).forEach(([name, value]) => {
      const cachedValue = this.cookieCache.get(name);
      
      if (cachedValue === undefined) {
        // New cookie
        this.cookieCache.set(name, value);
        this.notifyListeners({
          name,
          value,
          action: 'set',
          timestamp: new Date().toISOString()
        });
      } else if (cachedValue !== value) {
        // Updated cookie
        this.cookieCache.set(name, value);
        this.notifyListeners({
          name,
          value,
          action: 'update',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Check for removed cookies
    cachedNames.forEach(name => {
      if (!currentNames.has(name)) {
        this.cookieCache.delete(name);
        this.notifyListeners({
          name,
          value: null,
          action: 'remove',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private parseCookieString(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name && valueParts.length > 0) {
        const value = valueParts.join('=');
        try {
          cookies[name.trim()] = decodeURIComponent(value);
        } catch (e) {
          cookies[name.trim()] = value;
        }
      }
    });
    
    return cookies;
  }

  private notifyListeners(event: CookieChangeEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cookie change listener:', error);
      }
    });

    // Broadcast to other tabs
    if (typeof localStorage !== 'undefined') {
      try {
        const key = `cookie_change_${Date.now()}_${Math.random()}`;
        localStorage.setItem(key, JSON.stringify(event));
        
        // Clean up after a short delay
        setTimeout(() => {
          localStorage.removeItem(key);
        }, 1000);
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  public setCookie(name: string, value: string, options: CookieOptions = {}): void {
    if (typeof document === 'undefined') return;
    
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    
    if (options.expires) {
      let expires: string;
      if (typeof options.expires === 'number') {
        const date = new Date();
        date.setTime(date.getTime() + options.expires * 24 * 60 * 60 * 1000);
        expires = date.toUTCString();
      } else if (options.expires instanceof Date) {
        expires = options.expires.toUTCString();
      } else {
        expires = options.expires;
      }
      cookieString += `; expires=${expires}`;
    }
    
    if (options.path) {
      cookieString += `; path=${options.path}`;
    }
    
    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }
    
    if (options.secure) {
      cookieString += `; secure`;
    }
    
    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }
    
    if (options.httpOnly) {
      cookieString += `; httponly`;
    }
    
    document.cookie = cookieString;
    
    // Update cache and notify
    const oldValue = this.cookieCache.get(name);
    this.cookieCache.set(name, value);
    
    this.notifyListeners({
      name,
      value,
      action: oldValue === undefined ? 'set' : 'update',
      timestamp: new Date().toISOString()
    });
  }

  public getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = this.parseCookieString(document.cookie);
    return cookies[name] || null;
  }

  public removeCookie(name: string, options: Omit<CookieOptions, 'expires'> = {}): void {
    this.setCookie(name, '', {
      ...options,
      expires: new Date(0)
    });
    
    this.cookieCache.delete(name);
    
    this.notifyListeners({
      name,
      value: null,
      action: 'remove',
      timestamp: new Date().toISOString()
    });
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

  public getAllCookies(): Record<string, string> {
    if (typeof document === 'undefined') return {};
    return this.parseCookieString(document.cookie);
  }
}

// Create singleton instance
const cookieManager = new RealTimeCookieManager();

// Export convenience functions
export const setCookie = (name: string, value: string, options?: CookieOptions) => {
  cookieManager.setCookie(name, value, options);
};

export const getCookie = (name: string) => {
  return cookieManager.getCookie(name);
};

export const removeCookie = (name: string, options?: Omit<CookieOptions, 'expires'>) => {
  cookieManager.removeCookie(name, options);
};

export const subscribeToCookieChanges = (listener: CookieChangeListener) => {
  return cookieManager.subscribeToCookieChanges(listener);
};

export const getAllCookies = () => {
  return cookieManager.getAllCookies();
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).cookieManager = cookieManager;
}
