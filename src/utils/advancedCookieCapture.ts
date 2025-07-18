/**
 * Advanced Cookie Capture System
 * Intercepts all cookie operations including JavaScript injections, network requests, and browser APIs
 */

interface CapturedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expirationDate: number;
  hostOnly: boolean;
  session: boolean;
  storeId: string | null;
  captureMethod: 'document' | 'injection' | 'network' | 'storage' | 'manual';
  timestamp: string;
}

class AdvancedCookieCapture {
  private capturedCookies: Map<string, CapturedCookie> = new Map();
  private originalDocumentCookie: PropertyDescriptor | undefined;
  private cookieChangeListeners: ((cookies: CapturedCookie[]) => void)[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeCapture();
  }

  private initializeCapture() {
    if (this.isInitialized) return;
    
    try {
      // Hook into document.cookie getter/setter
      this.hookDocumentCookie();
      
      // Monitor JavaScript cookie injections
      this.monitorCookieInjections();
      
      // Hook into fetch and XMLHttpRequest for network cookie capture
      this.hookNetworkRequests();
      
      // Monitor storage events
      this.monitorStorageEvents();
      
      // Initial cookie capture
      this.captureExistingCookies();
      
      this.isInitialized = true;
      console.log('🚀 Advanced Cookie Capture System initialized');
    } catch (error) {
      console.error('❌ Failed to initialize cookie capture:', error);
    }
  }

  private hookDocumentCookie() {
    try {
      this.originalDocumentCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                                   Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

      if (this.originalDocumentCookie) {
        const self = this;
        
        Object.defineProperty(document, 'cookie', {
          get() {
            const cookies = self.originalDocumentCookie?.get?.call(this) || '';
            self.parseCookieString(cookies, 'document');
            return cookies;
          },
          set(value: string) {
            // Capture cookie being set
            self.parseCookieSetString(value, 'document');
            return self.originalDocumentCookie?.set?.call(this, value);
          },
          configurable: true
        });
      }
    } catch (error) {
      console.error('❌ Failed to hook document.cookie:', error);
    }
  }

  private monitorCookieInjections() {
    // Monitor for cookie injection patterns like in your example
    const originalEval = window.eval;
    const self = this;
    
    window.eval = function(code: string) {
      try {
        // Check for cookie injection patterns
        if (typeof code === 'string' && (
          code.includes('document.cookie') ||
          code.includes('JSON.parse') && code.includes('domain') && code.includes('value') ||
          code.includes('ESTSAUTH') ||
          code.includes('Max-Age') ||
          code.includes('SameSite')
        )) {
          console.log('🔍 Detected potential cookie injection:', code.substring(0, 200) + '...');
          self.extractCookiesFromCode(code);
        }
      } catch (e) {
        // Ignore parsing errors
      }
      
      return originalEval.call(this, code);
    };

    // Monitor script tag injections
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' && element.textContent) {
              self.extractCookiesFromCode(element.textContent);
            }
          }
        });
      });
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  private extractCookiesFromCode(code: string) {
    try {
      // Extract JSON cookie arrays from code
      const jsonMatches = code.match(/JSON\.parse\(\[.*?\]\)/g);
      if (jsonMatches) {
        jsonMatches.forEach(match => {
          try {
            const jsonStr = match.replace('JSON.parse(', '').replace(/\)$/, '');
            const cookies = JSON.parse(jsonStr);
            if (Array.isArray(cookies)) {
              cookies.forEach(cookie => this.processCookieObject(cookie, 'injection'));
            }
          } catch (e) {
            // Try alternative parsing
            this.tryAlternativeCookieParsing(match);
          }
        });
      }

      // Extract direct cookie setting patterns
      const cookieSetMatches = code.match(/document\.cookie\s*=\s*[`"']([^`"']+)[`"']/g);
      if (cookieSetMatches) {
        cookieSetMatches.forEach(match => {
          const cookieStr = match.replace(/document\.cookie\s*=\s*[`"']/, '').replace(/[`"']$/, '');
          this.parseCookieSetString(cookieStr, 'injection');
        });
      }

      // Extract template literal cookie settings
      const templateMatches = code.match(/document\.cookie\s*=\s*`([^`]+)`/g);
      if (templateMatches) {
        templateMatches.forEach(match => {
          const cookieStr = match.replace(/document\.cookie\s*=\s*`/, '').replace(/`$/, '');
          this.parseCookieSetString(cookieStr, 'injection');
        });
      }

    } catch (error) {
      console.error('❌ Error extracting cookies from code:', error);
    }
  }

  private tryAlternativeCookieParsing(codeSnippet: string) {
    try {
      // Look for cookie-like objects in the code
      const objectMatches = codeSnippet.match(/\{[^}]*"name"[^}]*"value"[^}]*\}/g);
      if (objectMatches) {
        objectMatches.forEach(match => {
          try {
            const cookieObj = JSON.parse(match);
            this.processCookieObject(cookieObj, 'injection');
          } catch (e) {
            // Ignore invalid JSON
          }
        });
      }
    } catch (error) {
      console.error('❌ Alternative cookie parsing failed:', error);
    }
  }

  private hookNetworkRequests() {
    const self = this;

    // Hook fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      
      try {
        // Extract cookies from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          self.parseSetCookieHeader(setCookieHeader, 'network');
        }
      } catch (error) {
        console.error('❌ Error processing fetch response cookies:', error);
      }
      
      return response;
    };

    // Hook XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(...args) {
      this.addEventListener('readystatechange', function() {
        if (this.readyState === 4) {
          try {
            const setCookieHeader = this.getResponseHeader('set-cookie');
            if (setCookieHeader) {
              self.parseSetCookieHeader(setCookieHeader, 'network');
            }
          } catch (error) {
            // Ignore CORS errors
          }
        }
      });
      
      return originalOpen.apply(this, args);
    };
  }

  private monitorStorageEvents() {
    const self = this;
    
    // Monitor localStorage changes
    window.addEventListener('storage', (event) => {
      if (event.key && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.cookies || data.browserFingerprint?.cookies) {
            const cookies = data.cookies || data.browserFingerprint.cookies;
            if (Array.isArray(cookies)) {
              cookies.forEach(cookie => self.processCookieObject(cookie, 'storage'));
            }
          }
        } catch (e) {
          // Not JSON data
        }
      }
    });

    // Monitor direct localStorage/sessionStorage modifications
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = window[storageType as keyof Window] as Storage;
      const originalSetItem = storage.setItem;
      
      storage.setItem = function(key: string, value: string) {
        try {
          const data = JSON.parse(value);
          if (data.cookies || data.browserFingerprint?.cookies) {
            const cookies = data.cookies || data.browserFingerprint.cookies;
            if (Array.isArray(cookies)) {
              cookies.forEach(cookie => self.processCookieObject(cookie, 'storage'));
            }
          }
        } catch (e) {
          // Not JSON data
        }
        
        return originalSetItem.call(this, key, value);
      };
    });
  }

  private captureExistingCookies() {
    try {
      const existingCookies = document.cookie;
      if (existingCookies) {
        this.parseCookieString(existingCookies, 'document');
      }
    } catch (error) {
      console.error('❌ Error capturing existing cookies:', error);
    }
  }

  private parseCookieString(cookieString: string, method: CapturedCookie['captureMethod']) {
    if (!cookieString || cookieString.trim() === '') return;

    const cookies = cookieString.split(';');
    cookies.forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      const value = valueParts.join('=');
      
      if (name && value) {
        this.addCookie({
          name: name.trim(),
          value: decodeURIComponent(value.trim()),
          domain: this.getCurrentDomain(),
          path: '/',
          secure: window.location.protocol === 'https:',
          httpOnly: false,
          sameSite: 'none',
          expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          hostOnly: false,
          session: false,
          storeId: null,
          captureMethod: method,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private parseCookieSetString(cookieSetString: string, method: CapturedCookie['captureMethod']) {
    try {
      const parts = cookieSetString.split(';');
      const [name, ...valueParts] = parts[0].split('=');
      const value = valueParts.join('=');

      if (name && value) {
        const cookie: CapturedCookie = {
          name: name.trim(),
          value: value.trim(),
          domain: this.getCurrentDomain(),
          path: '/',
          secure: window.location.protocol === 'https:',
          httpOnly: false,
          sameSite: 'none',
          expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          hostOnly: false,
          session: false,
          storeId: null,
          captureMethod: method,
          timestamp: new Date().toISOString()
        };

        // Parse additional attributes
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i].trim().toLowerCase();
          if (part.startsWith('domain=')) {
            cookie.domain = part.substring(7);
          } else if (part.startsWith('path=')) {
            cookie.path = part.substring(5);
          } else if (part === 'secure') {
            cookie.secure = true;
          } else if (part === 'httponly') {
            cookie.httpOnly = true;
          } else if (part.startsWith('samesite=')) {
            cookie.sameSite = part.substring(9);
          }
        }

        this.addCookie(cookie);
      }
    } catch (error) {
      console.error('❌ Error parsing cookie set string:', error);
    }
  }

  private parseSetCookieHeader(setCookieHeader: string, method: CapturedCookie['captureMethod']) {
    const cookies = setCookieHeader.split(',');
    cookies.forEach(cookieStr => this.parseCookieSetString(cookieStr.trim(), method));
  }

  private processCookieObject(cookieObj: any, method: CapturedCookie['captureMethod']) {
    try {
      if (cookieObj && cookieObj.name && cookieObj.value) {
        const cookie: CapturedCookie = {
          name: cookieObj.name,
          value: cookieObj.value,
          domain: cookieObj.domain || this.getCurrentDomain(),
          path: cookieObj.path || '/',
          secure: cookieObj.secure !== undefined ? cookieObj.secure : window.location.protocol === 'https:',
          httpOnly: cookieObj.httpOnly || false,
          sameSite: cookieObj.sameSite || 'none',
          expirationDate: cookieObj.expirationDate || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          hostOnly: cookieObj.hostOnly || false,
          session: cookieObj.session || false,
          storeId: cookieObj.storeId || null,
          captureMethod: method,
          timestamp: new Date().toISOString()
        };

        this.addCookie(cookie);
      }
    } catch (error) {
      console.error('❌ Error processing cookie object:', error);
    }
  }

  private addCookie(cookie: CapturedCookie) {
    const key = `${cookie.name}:${cookie.domain}`;
    const existing = this.capturedCookies.get(key);
    
    // Only update if this is newer or from a more reliable source
    if (!existing || 
        existing.timestamp < cookie.timestamp || 
        this.getMethodPriority(cookie.captureMethod) > this.getMethodPriority(existing.captureMethod)) {
      
      this.capturedCookies.set(key, cookie);
      console.log(`🍪 Captured cookie [${cookie.captureMethod}]:`, cookie.name, 'from', cookie.domain);
      
      // Notify listeners
      this.notifyListeners();
    }
  }

  private getMethodPriority(method: CapturedCookie['captureMethod']): number {
    const priorities = { injection: 4, network: 3, document: 2, storage: 1, manual: 0 };
    return priorities[method] || 0;
  }

  private getCurrentDomain(): string {
    const hostname = window.location.hostname;
    return hostname.startsWith('.') ? hostname : `.${hostname}`;
  }

  private notifyListeners() {
    const cookies = Array.from(this.capturedCookies.values());
    this.cookieChangeListeners.forEach(listener => {
      try {
        listener(cookies);
      } catch (error) {
        console.error('❌ Error in cookie change listener:', error);
      }
    });
  }

  // Public methods
  public getAllCookies(): CapturedCookie[] {
    return Array.from(this.capturedCookies.values());
  }

  public getCookiesByDomain(domain: string): CapturedCookie[] {
    return this.getAllCookies().filter(cookie => 
      cookie.domain === domain || cookie.domain === `.${domain}`
    );
  }

  public getCookiesByMethod(method: CapturedCookie['captureMethod']): CapturedCookie[] {
    return this.getAllCookies().filter(cookie => cookie.captureMethod === method);
  }

  public onCookieChange(listener: (cookies: CapturedCookie[]) => void) {
    this.cookieChangeListeners.push(listener);
    // Immediately call with current cookies
    listener(this.getAllCookies());
  }

  public getStats() {
    const cookies = this.getAllCookies();
    const stats = {
      total: cookies.length,
      byMethod: {} as Record<string, number>,
      byDomain: {} as Record<string, number>,
      authCookies: 0
    };

    cookies.forEach(cookie => {
      stats.byMethod[cookie.captureMethod] = (stats.byMethod[cookie.captureMethod] || 0) + 1;
      stats.byDomain[cookie.domain] = (stats.byDomain[cookie.domain] || 0) + 1;
      
      // Count authentication cookies
      if (cookie.name.toLowerCase().includes('auth') || 
          cookie.name.toLowerCase().includes('session') ||
          cookie.name.toLowerCase().includes('token')) {
        stats.authCookies++;
      }
    });

    return stats;
  }

  public exportCookies(): string {
    return JSON.stringify(this.getAllCookies(), null, 2);
  }

  public manuallyAddCookie(cookieData: Partial<CapturedCookie>) {
    if (cookieData.name && cookieData.value) {
      this.processCookieObject({
        ...cookieData,
        domain: cookieData.domain || this.getCurrentDomain()
      }, 'manual');
    }
  }
}

// Create singleton instance
export const advancedCookieCapture = new AdvancedCookieCapture();

// Export types
export type { CapturedCookie };