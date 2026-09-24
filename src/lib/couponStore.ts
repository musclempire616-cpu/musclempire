import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");
const CACHE_KEY = "me_coupons_v2";
const CACHE_TS_KEY = "me_coupons_ts";
const LAST_EDIT_KEY = "me_coupons_last_edit_ts";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  plans: string[];
  enabled: boolean;
  description?: string;
}

const DEFAULT_COUPONS: Coupon[] = [
  { id: "c_default_1", code: "MUSCLEMPIRE25", discount: 25, plans: [], enabled: true, description: "New Member Special 25% OFF" },
  { id: "c_default_2", code: "CROSSFIT20", discount: 20, plans: [], enabled: true, description: "CrossFit Power Pass 20% OFF" },
  { id: "c_default_3", code: "FEMALEFIT", discount: 20, plans: [], enabled: true, description: "Women's Transformation Deal 20% OFF" },
  { id: "c_default_4", code: "WELCOME10", discount: 10, plans: [], enabled: true, description: "Welcome Discount 10% OFF" },
];

// ── localStorage (instant read/write) ───────────────────────────────────────

function readCache(): Coupon[] {
  try {
    const item = localStorage.getItem(CACHE_KEY);
    if (item === null) return DEFAULT_COUPONS;
    return JSON.parse(item);
  } catch {
    return DEFAULT_COUPONS;
  }
}

function writeCache(coupons: Coupon[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(coupons));
  localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
}

function recordLocalEdit(): void {
  localStorage.setItem(LAST_EDIT_KEY, String(Date.now()));
}

function isRecentLocalEdit(): boolean {
  const ts = parseInt(localStorage.getItem(LAST_EDIT_KEY) || "0", 10);
  return Date.now() - ts < 15_000; // Skip sheet overwrite for 15s after user edit
}

function isCacheStale(): boolean {
  const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) || "0", 10);
  return Date.now() - ts > CACHE_TTL;
}

// ── Sheets (background sync only) ───────────────────────────────────────────

export async function pullFromSheets(retry = 1): Promise<Coupon[]> {
  if (isRecentLocalEdit()) {
    return readCache();
  }

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getCoupons&token=${T}&_t=${Date.now()}`, {
        redirect: "follow",
        cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (Array.isArray(json?.coupons)) {
        if (!isRecentLocalEdit()) {
          const coupons = json.coupons as Coupon[];
          writeCache(coupons);
          window.dispatchEvent(new CustomEvent("couponsUpdated"));
          return coupons;
        }
      }
    } catch (e) {
      console.warn("[couponStore] pullFromSheets failed attempt:", attempt, e);
      if (attempt < retry) await new Promise(r => setTimeout(r, 800));
    }
  }
  return readCache();
}

function pushToSheets(coupons: Coupon[]): void {
  const dataStr = JSON.stringify(coupons);
  const qs = new URLSearchParams({
    action: "saveCoupons",
    token: T,
    data: dataStr,
    _t: String(Date.now())
  }).toString();

  fetch(`${APPS_SCRIPT_URL}?${qs}`, {
    method: "GET",
    redirect: "follow",
    cache: "no-store"
  }).catch(() => {});
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCoupons(): Coupon[] {
  return readCache();
}

function _save(coupons: Coupon[]): void {
  recordLocalEdit();
  writeCache(coupons);
  pushToSheets(coupons);
  window.dispatchEvent(new CustomEvent("couponsUpdated"));
}

export function addCoupon(coupon: Omit<Coupon, "id">): void {
  const coupons = readCache();
  if (coupons.find(c => c.code === coupon.code.toUpperCase())) return; // no duplicates
  coupons.push({ id: "coupon_" + Date.now(), ...coupon, code: coupon.code.toUpperCase() });
  _save(coupons);
}

export function updateCoupon(id: string, updated: Partial<Coupon>): void {
  const current = readCache();
  const next = current.map(c => c.id === id ? { ...c, ...updated } : c);
  _save(next);
}

export function removeCoupon(id: string): void {
  const current = readCache();
  const next = current.filter(c => c.id !== id);
  _save(next);
}

export function saveCoupons(coupons: Coupon[]): void {
  _save(coupons);
}

export function ensureCouponExists(code: string, discount = 25, description?: string): void {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return;
  const existing = readCache().find(c => c.code === cleanCode);
  if (existing) {
    // Update discount if it changed
    if (existing.discount !== (discount || 20)) {
      updateCoupon(existing.id, { discount: discount || 20 });
    }
  } else {
    addCoupon({ code: cleanCode, discount: discount || 20, plans: [], enabled: true, description: description || `Coupon for ${cleanCode}` });
  }
}

export function validateCoupon(code: string, planName: string): { discount: number; coupon: Coupon } | null {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) return null;

  let coupons = getCoupons();
  let coupon = coupons.find(c => c.code === cleanCode && c.enabled);

  // If not found in coupon store, check active offers in localStorage as fallback
  if (!coupon) {
    try {
      const activeOffers = JSON.parse(localStorage.getItem("me_offers_v2") || "[]");
      const matchedOffer = activeOffers.find((o: any) => o.couponCode && o.couponCode.toUpperCase().trim() === cleanCode && o.status !== "expired");
      if (matchedOffer) {
        const discNum = parseInt((matchedOffer.discount || "").replace(/\D/g, ""), 10) || 20;
        ensureCouponExists(cleanCode, discNum, `${matchedOffer.title} Offer Coupon`);
        coupons = getCoupons();
        coupon = coupons.find(c => c.code === cleanCode && c.enabled);
      }
    } catch {}
  }

  if (!coupon) return null;
  if (coupon.plans && coupon.plans.length > 0 && !coupon.plans.includes(planName)) return null;
  return { discount: coupon.discount, coupon };
}

// Legacy async compat shims (pricing-table uses async validateCoupon)
export async function syncCouponsFromSheets(): Promise<void> { await pullFromSheets(); }





