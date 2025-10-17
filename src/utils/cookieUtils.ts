/**
 * cookieUtils.ts
 *
 * Utility functions to capture/normalize cookie data.
 * - parseDocumentCookies: parse document.cookie into a name->value map
 * - getDocumentCookieString: safe access to document.cookie
 * - normalizeCookieArray: normalize cookie arrays (server/browser dump) to CookieMeta[]
 * - buildCookieCapture(optionalFullCookieList?): returns { documentCookies, cookiesParsed, cookieList? }
 *
 * NOTE: browser JS cannot read httpOnly cookie flags or some attributes. If you have a full cookie dump
 * (like the JSON you pasted), pass it into buildCookieCapture so it can be normalized and attached.
 *
 * Does not hardcode any example cookie data.
 */

import type { CapturedCookie } from './advancedCookieCapture';

export interface CookieMeta {
  domain: string;
  expirationDate?: number;
  hostOnly?: boolean;
  httpOnly?: boolean;
  name: string;
  path?: string;
  sameSite?: string;
  secure?: boolean;
  session?: boolean;
  storeId?: string | null;
  value: string;
  // optional metadata
  captureMethod?: 'document' | 'injection' | 'network' | 'storage' | 'manual' | string;
  timestamp?: string;
}

/**
 * Safely return document.cookie string ('' when unavailable)
 */
export function getDocumentCookieString(): string {
  try {
    if (typeof document === 'undefined') return '';
    return document.cookie || '';
  } catch (e) {
    return '';
  }
}

/**
 * Parse document.cookie into object { name: value }
 */
export function parseDocumentCookies(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const cookieStr = getDocumentCookieString();
    if (!cookieStr) return out;

    const parts = cookieStr.split(';');
    for (const raw of parts) {
      const [rawName, ...rawValParts] = raw.trim().split('=');
      if (!rawName) continue;
      const rawVal = rawValParts.join('=');
      try {
        out[rawName.trim()] = decodeURIComponent(rawVal || '');
      } catch (e) {
        out[rawName.trim()] = rawVal || '';
      }
    }
  } catch (e) {
    // ignore
  }
  return out;
}

/**
 * Normalize a cookie-like object into CookieMeta (best-effort)
 */
function normalizeCookieObject(obj: any): CookieMeta | null {
  if (!obj || !obj.name) return null;
  const name: string = String(obj.name);
  const value: string = obj.value !== undefined ? String(obj.value) : '';
  const domain: string = obj.domain || obj.host || (typeof window !== 'undefined' ? `.${window.location.hostname}` : '.example.com');
  const path: string = obj.path || '/';
  const secure: boolean = !!obj.secure;
  const httpOnly: boolean = !!obj.httpOnly;
  const sameSite: string = obj.sameSite || obj.same_site || 'none';
  const expirationDate: number = obj.expirationDate || obj.expires || obj.expire || Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const hostOnly: boolean = obj.hostOnly || false;
  const session: boolean = obj.session || false;
  const storeId: string | null = obj.storeId || null;
  const captureMethod = obj.captureMethod || obj.capture_method || undefined;
  const timestamp = obj.timestamp || (new Date()).toISOString();

  return {
    name,
    value,
    domain,
    path,
    secure,
    httpOnly,
    sameSite,
    expirationDate,
    hostOnly,
    session,
    storeId,
    captureMethod,
    timestamp
  };
}

/**
 * Normalize an array of cookie-like objects (server dump, driver dump, etc.)
 * Returns CookieMeta[]
 */
export function normalizeCookieArray(rawList: any[] | undefined | null): CookieMeta[] {
  if (!Array.isArray(rawList)) return [];
  const out: CookieMeta[] = [];
  for (const raw of rawList) {
    const normalized = normalizeCookieObject(raw);
    if (normalized) out.push(normalized);
  }
  return out;
}

/**
 * Try to consume the advancedCookieCapture singleton if available.
 * This is an optional runtime integration: if advancedCookieCapture is present in src/utils,
 * we'll use its captured cookies and normalize them.
 */
function tryGetAdvancedCapturedCookies(): CookieMeta[] {
  try {
    // Try to import the advanced cookie capture system
    const { advancedCookieCapture } = require('./advancedCookieCapture');
    if (advancedCookieCapture && typeof advancedCookieCapture.getAllCookies === 'function') {
      const captured: CapturedCookie[] = advancedCookieCapture.getAllCookies() || [];
      return normalizeCookieArray(captured);
    }
    return [];
  } catch (e) {
    // If advanced cookie capture is not available, try direct import
    try {
      // Dynamic import fallback
      if (typeof window !== 'undefined' && (window as any).advancedCookieCapture) {
        const captured = (window as any).advancedCookieCapture.getAllCookies() || [];
        return normalizeCookieArray(captured);
      }
    } catch (e2) {
      // Ignore if not available
    }
    return [];
  }
}

/**
 * Build cookie capture object for telemetry/session payload.
 * - optionalFullCookieList: pass a full cookie array (server/client dump). If provided, it'll be normalized and attached as cookieList.
 * - returns { documentCookies, cookiesParsed, cookieList? }
 */
export function buildCookieCapture(optionalFullCookieList?: any[] | undefined) {
  const documentCookies = getDocumentCookieString();
  const cookiesParsed = parseDocumentCookies();

  // Try to gather cookieList from these sources in order:
  // 1) optionalFullCookieList (explicitly provided)
  // 2) advancedCookieCapture singleton (if present)
  // 3) fallback: derive simple CookieMeta[] from document.cookie
  let cookieList: CookieMeta[] | undefined;
  if (Array.isArray(optionalFullCookieList) && optionalFullCookieList.length > 0) {
    cookieList = normalizeCookieArray(optionalFullCookieList);
  } else {
    const advanced = tryGetAdvancedCapturedCookies();
    if (advanced.length > 0) {
      cookieList = advanced;
    } else {
      // fallback: build from document.cookie name/values
      const parsed = cookiesParsed;
      cookieList = Object.keys(parsed).map(name => ({
        name,
        value: parsed[name],
        domain: (typeof window !== 'undefined' ? `.${window.location.hostname}` : '.example.com'),
        path: '/',
        secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
        httpOnly: false,
        sameSite: 'none',
        expirationDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        hostOnly: false,
        session: false,
        storeId: null,
        captureMethod: 'document',
        timestamp: new Date().toISOString()
      }));
    }
  }

  return {
    documentCookies,
    cookiesParsed,
    cookieList
  } as {
    documentCookies: string;
    cookiesParsed: Record<string, string>;
    cookieList?: CookieMeta[];
  };
}

export default {
  getDocumentCookieString,
  parseDocumentCookies,
  normalizeCookieArray,
  buildCookieCapture
};