import type { Offer } from "@/data/offers";
import { activeOffers } from "@/data/offers";
import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");
const CACHE_KEY = "me_offers_v2";
const CACHE_TS_KEY = "me_offers_ts";
const LAST_EDIT_KEY = "me_offers_last_edit_ts";
const CACHE_TTL = 30_000;

function readCache(): Offer[] {
  try {
    const item = localStorage.getItem(CACHE_KEY);
    if (item === null) return activeOffers;
    return JSON.parse(item);
  } catch {
    return activeOffers;
  }
}

function writeCache(offers: Offer[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(offers));
  localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
}

function recordLocalEdit(): void {
  localStorage.setItem(LAST_EDIT_KEY, String(Date.now()));
}

function isRecentLocalEdit(): boolean {
  const ts = parseInt(localStorage.getItem(LAST_EDIT_KEY) || "0", 10);
  return Date.now() - ts < 15_000; // Skip sheet overwrite for 15s after user edit
}

// ── Sheets (background) ───────────────────────────────────────────────────────

export async function pullOffersFromSheets(retry = 1): Promise<Offer[]> {
  if (isRecentLocalEdit()) {
    return readCache();
  }

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getOffers&token=${T}&_t=${Date.now()}`, {
        redirect: "follow",
        cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (Array.isArray(json?.offers)) {
        if (!isRecentLocalEdit()) {
          const offers = json.offers;
          writeCache(offers);
          window.dispatchEvent(new CustomEvent("offersUpdated"));
          return offers;
        }
      }
    } catch (e) {
      console.warn("[offersStore] pullOffersFromSheets failed attempt:", attempt, e);
      if (attempt < retry) await new Promise(r => setTimeout(r, 800));
    }
  }
  return readCache();
}

function pushToSheets(offers: Offer[]): void {
  const stripped = offers.map(o => ({
    ...o,
    image: o.image?.startsWith("data:") ? "" : (o.image || ""),
  }));
  const dataStr = JSON.stringify(stripped);
  const qs = new URLSearchParams({
    action: "saveOffers",
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

export function getOffers(): Offer[] {
  return readCache();
}

export function getOffersAndSync(): Offer[] {
  const cached = readCache();
  pullOffersFromSheets();
  return cached;
}

function _save(offers: Offer[]): void {
  recordLocalEdit();
  writeCache(offers);
  pushToSheets(offers);
  window.dispatchEvent(new CustomEvent("offersUpdated"));
}

export function saveOffers(offers: Offer[]): void { _save(offers); }

export function addOffer(offer: Omit<Offer, "id">): void {
  const offers = readCache();
  offers.push({ id: "offer_" + Date.now(), ...offer });
  _save(offers);
}

export function removeOffer(id: string): void {
  const current = readCache();
  const next = current.filter(o => o.id !== id);
  _save(next);
}

export function updateOffer(id: string, updated: Partial<Offer>): void {
  const current = readCache();
  const next = current.map(o => o.id === id ? { ...o, ...updated } : o);
  _save(next);
}





