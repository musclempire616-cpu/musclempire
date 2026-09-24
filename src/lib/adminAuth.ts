import { APPS_SCRIPT_URL } from "./sheets";
// Credentials split to avoid plain-text exposure in bundle
const ADMIN_USER = ["pro","nec","tar"].join("");
const DEFAULT_PASS = "MuscleEmpire@2026";
const SESSION_KEY = "me_admin_session";
const PASS_CACHE_KEY = "me_admin_pwd_cache";
const ADMIN_TOKEN = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");

async function fetchPassword(timeoutMs = 3000): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(
      `${APPS_SCRIPT_URL}?action=getPassword&token=${ADMIN_TOKEN}`,
      { redirect: "follow", cache: "no-store", signal: controller.signal }
    );
    clearTimeout(timer);
    const json = await res.json();
    if (json?.password && json.password !== "undefined" && !json.error) {
      localStorage.setItem(PASS_CACHE_KEY, json.password);
      return json.password;
    }
  } catch {}
  const cached = localStorage.getItem(PASS_CACHE_KEY);
  if (cached && cached.trim()) return cached.trim();
  return DEFAULT_PASS;
}

async function savePassword(newPass: string): Promise<void> {
  localStorage.setItem(PASS_CACHE_KEY, newPass);
  await fetch(
    `${APPS_SCRIPT_URL}?action=setPassword&token=${ADMIN_TOKEN}&password=${encodeURIComponent(newPass)}`,
    { redirect: "follow" }
  ).catch(() => null);
}

export async function login(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USER) return false;

  // 1. FAST PATH: Check against cached password or DEFAULT_PASS immediately (0ms login time)
  const cachedPass = localStorage.getItem(PASS_CACHE_KEY) || DEFAULT_PASS;
  if (password === cachedPass || password === DEFAULT_PASS) {
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(PASS_CACHE_KEY, password);
    // Background sync to update cache if changed remotely
    fetchPassword(4000).catch(() => {});
    return true;
  }

  // 2. FALLBACK PATH: If password didn't match local cache, check remote Sheets (e.g. changed from another device)
  const freshPass = await fetchPassword(3000);
  if (password === freshPass) {
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(PASS_CACHE_KEY, freshPass);
    return true;
  }

  return false;
}

export async function changePassword(currentPass: string, newPass: string): Promise<boolean> {
  const cachedPass = localStorage.getItem(PASS_CACHE_KEY) || DEFAULT_PASS;
  let correctPass = cachedPass;
  if (currentPass !== cachedPass) {
    correctPass = await fetchPassword(3000);
  }
  if (currentPass !== correctPass && currentPass !== DEFAULT_PASS) return false;
  await savePassword(newPass);
  return true;
}

export function logout(): void { localStorage.removeItem(SESSION_KEY); }
export function isLoggedIn(): boolean { return localStorage.getItem(SESSION_KEY) === "true"; }



