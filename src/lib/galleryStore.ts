import { APPS_SCRIPT_URL } from "@/lib/sheets";

const T = ["ZujXfS4o6t","pRWL2vQmAT","JbEFBaVKCs","1O7UGPqDyk"].join("");

const IMAGES_KEY = "me_gallery_images_v2"; // v2 = no defaults, Sheets only
const IMAGES_TS_KEY = "me_gallery_images_ts";
const VIDEOS_KEY = "me_gallery_videos_v2";
const VIDEOS_TS_KEY = "me_gallery_videos_ts";
const CACHE_TTL = 60 * 1000; // 1 min

export interface GalleryImage { id: string; src: string; alt: string; }
export interface GalleryVideo { id: string; src: string; alt: string; thumbnail?: string; }

export function dedupeImages(images: GalleryImage[]): GalleryImage[] {
  const seenIds = new Set<string>();
  const seenSrcs = new Set<string>();
  return images.filter(img => {
    const normSrc = (img.src || "").trim().toLowerCase();
    if (!normSrc) return false;
    if (seenIds.has(img.id) || seenSrcs.has(normSrc)) return false;
    seenIds.add(img.id);
    seenSrcs.add(normSrc);
    return true;
  });
}

export function dedupeVideos(videos: GalleryVideo[]): GalleryVideo[] {
  const seenIds = new Set<string>();
  const seenSrcs = new Set<string>();
  return videos.filter(vid => {
    const normSrc = (vid.src || "").trim().toLowerCase();
    if (!normSrc) return false;
    if (seenIds.has(vid.id) || seenSrcs.has(normSrc)) return false;
    seenIds.add(vid.id);
    seenSrcs.add(normSrc);
    return true;
  });
}

// ── localStorage helpers ─────────────────────────────────────────────────────

function getLocalImages(): GalleryImage[] {
  try { return dedupeImages(JSON.parse(localStorage.getItem(IMAGES_KEY) || "[]")); } catch { return []; }
}
function saveLocalImages(images: GalleryImage[]): void {
  const deduped = dedupeImages(images);
  localStorage.setItem(IMAGES_KEY, JSON.stringify(deduped));
  localStorage.setItem(IMAGES_TS_KEY, String(Date.now()));
}
function isImagesCacheStale(): boolean {
  return Date.now() - parseInt(localStorage.getItem(IMAGES_TS_KEY) || "0", 10) > CACHE_TTL;
}

function getLocalVideos(): GalleryVideo[] {
  try { return dedupeVideos(JSON.parse(localStorage.getItem(VIDEOS_KEY) || "[]")); } catch { return []; }
}
function saveLocalVideos(videos: GalleryVideo[]): void {
  const deduped = dedupeVideos(videos);
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(deduped));
  localStorage.setItem(VIDEOS_TS_KEY, String(Date.now()));
}
function isVideosCacheStale(): boolean {
  return Date.now() - parseInt(localStorage.getItem(VIDEOS_TS_KEY) || "0", 10) > CACHE_TTL;
}

// ── Sheets ────────────────────────────────────────────────────────────────────

async function fetchImagesFromSheets(retry = 1): Promise<GalleryImage[] | null> {
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getImages&token=${T}&_t=${Date.now()}`, {
        redirect: "follow", cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (Array.isArray(json?.images)) return json.images;
    } catch {
      if (attempt < retry) await new Promise(r => setTimeout(r, 800));
    }
  }
  return null;
}

function saveImagesToSheets(images: GalleryImage[]): void {
  const dataStr = JSON.stringify(dedupeImages(images));
  const qs = new URLSearchParams({ action: "saveImages", token: T, data: dataStr, _t: String(Date.now()) }).toString();
  fetch(`${APPS_SCRIPT_URL}?${qs}`, { method: "GET", redirect: "follow", cache: "no-store" }).catch(() => {});
}

async function fetchVideosFromSheets(retry = 1): Promise<GalleryVideo[] | null> {
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getVideos&token=${T}&_t=${Date.now()}`, {
        redirect: "follow", cache: "no-store",
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (Array.isArray(json?.videos)) return json.videos;
    } catch {
      if (attempt < retry) await new Promise(r => setTimeout(r, 800));
    }
  }
  return null;
}

function saveVideosToSheets(videos: GalleryVideo[]): void {
  const dataStr = JSON.stringify(dedupeVideos(videos));
  const qs = new URLSearchParams({ action: "saveVideos", token: T, data: dataStr, _t: String(Date.now()) }).toString();
  fetch(`${APPS_SCRIPT_URL}?${qs}`, { method: "GET", redirect: "follow", cache: "no-store" }).catch(() => {});
}

// ── Public API — Images ──────────────────────────────────────────────────────

export async function getGalleryImages(): Promise<GalleryImage[]> {
  const local = getLocalImages();
  if (local.length === 0 || isImagesCacheStale()) {
    syncImagesFromSheets();
  }
  return local;
}

export async function syncImagesFromSheets(): Promise<GalleryImage[]> {
  const remote = await fetchImagesFromSheets();
  if (remote !== null) {
    const deduped = dedupeImages(remote);
    saveLocalImages(deduped);
    if (deduped.length < remote.length) {
      saveImagesToSheets(deduped);
    }
    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return deduped;
  }
  return getLocalImages();
}

export async function addGalleryImage(src: string, alt: string): Promise<void> {
  if (src.startsWith("data:")) throw new Error("Use a URL (imgbb.com) instead of uploading a file.");
  // Pull fresh first to avoid duplicates
  const remote = await fetchImagesFromSheets();
  const current = dedupeImages(remote ?? getLocalImages());
  const normSrc = src.trim().toLowerCase();
  // Check for duplicate src
  if (current.find(i => i.src.trim().toLowerCase() === normSrc)) return;
  current.push({ id: Date.now().toString(), src: src.trim(), alt: alt.trim() });
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  saveImagesToSheets(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
}

export async function removeGalleryImage(id: string): Promise<void> {
  // Pull fresh from Sheets first, then remove
  const remote = await fetchImagesFromSheets();
  const current = (remote ?? getLocalImages()).filter(i => i.id !== id);
  const deduped = dedupeImages(current);
  saveLocalImages(deduped);
  saveImagesToSheets(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
}

// ── Public API — Videos ──────────────────────────────────────────────────────

export async function getGalleryVideos(): Promise<GalleryVideo[]> {
  const local = getLocalVideos();
  if (local.length === 0 || isVideosCacheStale()) {
    syncVideosFromSheets();
  }
  return local;
}

export async function syncVideosFromSheets(): Promise<GalleryVideo[]> {
  const remote = await fetchVideosFromSheets();
  if (remote !== null) {
    const deduped = dedupeVideos(remote);
    saveLocalVideos(deduped);
    if (deduped.length < remote.length) {
      saveVideosToSheets(deduped);
    }
    window.dispatchEvent(new CustomEvent("galleryUpdated"));
    return deduped;
  }
  return getLocalVideos();
}

export async function addGalleryVideo(src: string, alt: string, thumbnail?: string): Promise<void> {
  if (src.startsWith("data:")) throw new Error("Use a URL instead of uploading a file.");
  const remote = await fetchVideosFromSheets();
  const current = dedupeVideos(remote ?? getLocalVideos());
  const normSrc = src.trim().toLowerCase();
  if (current.find(v => v.src.trim().toLowerCase() === normSrc)) return;
  current.push({ id: Date.now().toString(), src: src.trim(), alt: alt.trim(), thumbnail });
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  saveVideosToSheets(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
}

export async function removeGalleryVideo(id: string): Promise<void> {
  const remote = await fetchVideosFromSheets();
  const current = (remote ?? getLocalVideos()).filter(v => v.id !== id);
  const deduped = dedupeVideos(current);
  saveLocalVideos(deduped);
  saveVideosToSheets(deduped);
  window.dispatchEvent(new CustomEvent("galleryUpdated"));
}


