/**
 * Real-Time Cookie Management System
 * Provides reactive cookie state management with real-time updates across components
 */

import Cookies from 'js-cookie';

export interface CookieOptions {
  expires?: number | Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
}

export interface CookieChangeEvent {
  name: string;
  value: string | undefined;
  previousValue: string | undefined;
  action: 'set' | 'remove' | 'update';
  timestamp: Date;
}

type CookieChangeListener = (event: CookieChangeEvent) => void;

class RealTimeCookieManager {
  private listeners: Set<CookieChangeListener> = new Set();
  private cookieCache: Map<string, string> = new Map();
  private pollingInterval: number | null = null;
  private isPolling = false;

  constructor() {
    this.initializeCookieStore();
    this.startRealtimeMonitoring();
  }

  /**
   * Initialize the cookie store with current cookies
   */
  private initializeCookieStore(): void {
    const allCookies = Cookies.get();
    Object.entries(allCookies).forEach(([name, value]) => {
      this.cookieCache.set(name, value);
    });
  }

  /**
   * Start real-time monitoring for cookie changes
   */
  private startRealtimeMonitoring(): void {
    if (this.isPolling) return;
    
    this.isPolling = true;
    
    // Use modern Cookie Store API if available (Chrome, Safari 18.4+)
    if (typeof window !== 'undefined' && 'cookieStore' in window) {
      this.initializeCookieStoreAPI();
    } else {
      // Fallback to polling for older browsers
      this.startPollingMonitoring();
    }
  }

  /**
   * Initialize modern Cookie Store API for real-time updates
   */
  private initializeCookieStoreAPI(): void {
    try {
      // @ts-ignore - CookieStore API might not be in types yet
      const cookieStore = window.cookieStore;
      
      cookieStore.addEventListener('change', (event: any) => {
        // Handle cookie changes
        event.changed?.forEach((cookie: any) => {
          const previousValue = this.cookieCache.get(cookie.name);
          this.cookieCache.set(cookie.name, cookie.value);
          
          this.notifyListeners({
            name: cookie.name,
            value: cookie.value,
            previousValue,
            action: previousValue ? 'update' : 'set',
            timestamp: new Date()
          });
        });

        // Handle cookie deletions
        event.deleted?.forEach((cookie: any) => {
          const previousValue = this.cookieCache.get(cookie.name);
          this.cookieCache.delete(cookie.name);
          
          this.notifyListeners({
            name: cookie.name,
            value: undefined,
            previousValue,
            action: 'remove',
            timestamp: new Date()
          });
        });
      });

      console.log('🍪 Real-time cookie monitoring initialized with Cookie Store API');
    } catch (error) {
      console.warn('Cookie Store API failed, falling back to polling:', error);
      this.startPollingMonitoring();
    }
  }

  /**
   * Fallback polling monitoring for browsers without Cookie Store API
   */
  private startPollingMonitoring(): void {
    this.pollingInterval = window.setInterval(() => {
      this.checkCookieChanges();
    }, 1000); // Check every second

    console.log('🍪 Real-time cookie monitoring initialized with polling fallback');
  }

  /**
   * Check for cookie changes (polling fallback)
   */
  private checkCookieChanges(): void {
    const currentCookies = Cookies.get();
    const currentCookieNames = new Set(Object.keys(currentCookies));
    const cachedCookieNames = new Set(this.cookieCache.keys());

    // Check for new or updated cookies
    for (const [name, value] of Object.entries(currentCookies)) {
      const previousValue = this.cookieCache.get(name);
      
      if (previousValue !== value) {
        this.cookieCache.set(name, value);
        
        this.notifyListeners({
          name,
          value,
          previousValue,
          action: previousValue ? 'update' : 'set',
          timestamp: new Date()
        });
      }
    }

    // Check for deleted cookies
    for (const name of cachedCookieNames) {
      if (!currentCookieNames.has(name)) {
        const previousValue = this.cookieCache.get(name);
        this.cookieCache.delete(name);
        
        this.notifyListeners({
          name,
          value: undefined,
          previousValue,
          action: 'remove',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Notify all listeners of cookie changes
   */
  private notifyListeners(event: CookieChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cookie change listener:', error);
      }
    });
  }

  /**
   * Set a cookie with real-time notification
   */
  public setCookie(name: string, value: string, options?: CookieOptions): void {
    const previousValue = this.get(name);
    
    // Set the cookie using js-cookie
    Cookies.set(name, value, options);
    
    // Update cache
    this.cookieCache.set(name, value);
    
    // Notify listeners immediately
    this.notifyListeners({
      name,
      value,
      previousValue,
      action: previousValue ? 'update' : 'set',
      timestamp: new Date()
    });
  }

  /**
   * Get a cookie value
   */
  public get(name: string): string | undefined {
    return Cookies.get(name);
  }

  /**
   * Get all cookies
   */
  public getAll(): Record<string, string> {
    return Cookies.get();
  }

  /**
   * Remove a cookie with real-time notification
   */
  public removeCookie(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): void {
    const previousValue = this.get(name);
    
    if (previousValue !== undefined) {
      // Remove the cookie using js-cookie
      Cookies.remove(name, options);
      
      // Update cache
      this.cookieCache.delete(name);
      
      // Notify listeners immediately
      this.notifyListeners({
        name,
        value: undefined,
        previousValue,
        action: 'remove',
        timestamp: new Date()
      });
    }
  }

  /**
   * Subscribe to cookie changes
   */
  public subscribe(listener: CookieChangeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if a cookie exists
   */
  public exists(name: string): boolean {
    return this.get(name) !== undefined;
  }

  /**
   * Clear all cookies
   */
  public clearAll(): void {
    const allCookies = this.getAll();
    
    Object.keys(allCookies).forEach(name => {
      this.removeCookie(name);
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.listeners.clear();
    this.isPolling = false;
  }
}

// Create singleton instance
export const cookieManager = new RealTimeCookieManager();

// Export convenience functions
export const setCookie = (name: string, value: string, options?: CookieOptions) => 
  cookieManager.setCookie(name, value, options);

export const getCookie = (name: string) => 
  cookieManager.get(name);

export const removeCookie = (name: string, options?: Pick<CookieOptions, 'path' | 'domain'>) => 
  cookieManager.removeCookie(name, options);

export const subscribeToCookieChanges = (listener: CookieChangeListener) => 
  cookieManager.subscribe(listener);

export const getAllCookies = () => 
  cookieManager.getAll();

export const cookieExists = (name: string) => 
  cookieManager.exists(name);

export const clearAllCookies = () => 
  cookieManager.clearAll();