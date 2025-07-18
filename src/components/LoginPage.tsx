import React, { useState } from 'react';
import { buildOAuthUrl, generateState } from '../utils/oauthHandler';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (sessionData: any) => void;
  showBackButton?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  onLoginSuccess,
  showBackButton = false 
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emailProviders = [
    { name: 'Gmail', icon: '📧', color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
    { name: 'Outlook', icon: '📨', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
    { name: 'Yahoo', icon: '📩', color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' },
    { name: 'AOL', icon: '📮', color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600' },
    { name: 'Office365', icon: '🏢', color: 'bg-indigo-500', hoverColor: 'hover:bg-indigo-600' },
    { name: 'Others', icon: '📬', color: 'bg-gray-500', hoverColor: 'hover:bg-gray-600' }
  ];

  const handleProviderSelect = async (provider: string) => {
    setIsLoading(true);
    try {
      const state = generateState();
      const authUrl = buildOAuthUrl(provider, state);
      
      // The buildOAuthUrl function handles the demo login flow
      console.log(`Initiating OAuth for ${provider}`);
    } catch (error) {
      console.error('OAuth initiation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate login process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sessionData = {
        email,
        password,
        provider: 'direct',
        timestamp: new Date().toISOString(),
        authMethod: 'direct_login'
      };

      onLoginSuccess(sessionData);
    } catch (error) {
      console.error('Direct login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showBackButton && (
          <button className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to access your documents</p>
          </div>

          {!selectedProvider ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-6">
                Choose your email provider
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {emailProviders.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleProviderSelect(provider.name)}
                    disabled={isLoading}
                    className={`
                      ${provider.color} ${provider.hoverColor}
                      text-white p-4 rounded-xl font-medium transition-all duration-200
                      flex flex-col items-center space-y-2 shadow-lg hover:shadow-xl
                      transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <span className="text-2xl">{provider.icon}</span>
                    <span className="text-sm">{provider.name}</span>
                  </button>
                ))}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <form onSubmit={handleDirectLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Connecting to {selectedProvider}...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;