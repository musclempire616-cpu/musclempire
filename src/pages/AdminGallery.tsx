import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  getGalleryImages, addGalleryImage, removeGalleryImage, syncImagesFromSheets, type GalleryImage,
  getGalleryVideos, addGalleryVideo, removeGalleryVideo, syncVideosFromSheets, type GalleryVideo 
} from "@/lib/galleryStore";
import { Plus, Trash2, Image as ImageIcon, Video, LogOut, Users, Tag, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminGuard from "@/components/AdminGuard";
import { logout } from "@/lib/adminAuth";

function getYoutubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}?autoplay=1` : null;
}

function getYoutubeThumbnail(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg` : null;
}

function getDriveEmbedUrl(url: string): string | null {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
}

function getEmbedUrl(url: string): string | null {
  return getYoutubeEmbedUrl(url);
}

function getThumb(url: string): string | null {
  return getYoutubeThumbnail(url);
}export default function AdminGallery() {
  const [, navigate] = useLocation();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");
  const [newSrc, setNewSrc] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [newThumb, setNewThumb] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<GalleryVideo | null>(null);

  useEffect(() => {
    getGalleryImages().then(setImages);
    getGalleryVideos().then(setVideos);
    syncImagesFromSheets().then(setImages);
    syncVideosFromSheets().then(setVideos);
    const handler = () => {
      getGalleryImages().then(setImages);
      getGalleryVideos().then(setVideos);
    };
    window.addEventListener("galleryUpdated", handler);
    return () => window.removeEventListener("galleryUpdated", handler);
  }, []);

  const handleAdd = async () => {
    if (!newSrc.trim()) return;
    if (activeTab === "photos") {
      await addGalleryImage(newSrc.trim(), newAlt.trim() || "Gallery image");
      const list = await getGalleryImages();
      setImages(list);
    } else {
      await addGalleryVideo(newSrc.trim(), newAlt.trim() || "Gallery video", newThumb.trim() || undefined);
      const list = await getGalleryVideos();
      setVideos(list);
    }
    setNewSrc("");
    setNewAlt("");
    setNewThumb("");
    setShowAdd(false);
  };

  const handleRemove = async (id: string) => {
    if (activeTab === "photos") {
      await removeGalleryImage(id);
      const list = await getGalleryImages();
      setImages(list);
    } else {
      await removeGalleryVideo(id);
      const list = await getGalleryVideos();
      setVideos(list);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#0d1117] text-white">
        {/* Header */}
        <div className="border-b border-white/10 bg-[#161b22] sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                    <ImageIcon size={20} className="text-green-400" />
                    Gallery Manager
                  </h1>
                  <p className="text-white/30 text-xs mt-0.5">Manage gym photos and videos</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/sagarkharat/dashboard")}
                    className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white border border-white/10 hover:border-white/30 rounded-lg text-xs uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    <Users size={14} />
                    Assessments
                  </button>
                  <button
                    onClick={() => navigate("/sagarkharat/offers")}
                    className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white border border-white/10 hover:border-white/30 rounded-lg text-xs uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    <Tag size={14} />
                    Offers
                  </button>
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate("/sagarkharat"); }}
                className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-400/30 rounded-lg text-xs uppercase tracking-widest transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="px-6 py-8">
          <div className="max-w-6xl mx-auto">

            {/* Tab Selection */}
            <div className="flex gap-4 border-b border-white/10 pb-4 mb-6">
              <button
                onClick={() => { setActiveTab("photos"); setShowAdd(false); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 border cursor-pointer ${
                  activeTab === "photos"
                    ? "bg-[#E8A820] text-black border-[#E8A820]"
                    : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                }`}
              >
                <ImageIcon size={14} />
                Photos
              </button>
              <button
                onClick={() => { setActiveTab("videos"); setShowAdd(false); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 border cursor-pointer ${
                  activeTab === "videos"
                    ? "bg-[#E8A820] text-black border-[#E8A820]"
                    : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                }`}
              >
                <Video size={14} />
                Videos
              </button>
            </div>

            {/* Add button */}
            <div className="mb-8 flex justify-between items-center">
              <p className="text-white/40 text-sm">
                Total {activeTab === "photos" ? "images" : "videos"}:{" "}
                <span className="text-white font-bold">
                  {activeTab === "photos" ? images.length : videos.length}
                </span>
              </p>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Add {activeTab === "photos" ? "Image" : "Video"}
              </button>
            </div>

            {/* Add form */}
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#161b22] border border-white/10 rounded-xl p-6 mb-8"
              >
                <h3 className="text-white font-black uppercase tracking-wide text-sm mb-5">
                  Add New {activeTab === "photos" ? "Image" : "Video"}
                </h3>
                <div className="space-y-5">

                  {/* Alt text — shared for both upload methods */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Caption / Alt Text</label>
                    <input
                      type="text"
                      value={newAlt}
                      onChange={e => setNewAlt(e.target.value)}
                      placeholder={activeTab === "photos" ? "e.g. Main gym floor" : "e.g. Strength training session"}
                      className="w-full bg-[#0d1117] border border-white/10 focus:border-green-400 focus:outline-none h-11 px-3 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors"
                    />
                  </div>

                  {/* URL-only note */}
                  <div className="w-full py-3 px-4 border border-green-400/20 rounded-xl bg-green-400/5">
                    <p className="text-green-400/80 text-xs text-center leading-relaxed">
                      📎 Use a hosted URL so images sync across all devices.<br />
                      Upload to <strong className="text-green-400">imgbb.com</strong> → copy Direct Link → paste below.
                    </p>
                  </div>

                  {/* URL input */}
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">
                      {activeTab === "photos" ? "Image URL" : "Video URL / YouTube Link / Google Drive Link"}
                    </label>
                    <input
                      type="text"
                      value={newSrc}
                      onChange={e => setNewSrc(e.target.value)}
                      placeholder={activeTab === "photos" ? "https://example.com/image.jpg" : "https://youtube.com/... or Google Drive link"}
                      className="w-full bg-[#0d1117] border border-white/10 focus:border-green-400 focus:outline-none h-11 px-3 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors"
                    />
                  </div>

                  {/* Thumbnail URL — videos only */}
                  {activeTab === "videos" && (
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">
                        Thumbnail Image URL <span className="text-white/20 normal-case">(optional — for Drive videos)</span>
                      </label>
                      <input
                        type="text"
                        value={newThumb}
                        onChange={e => setNewThumb(e.target.value)}
                        placeholder="https://example.com/thumbnail.jpg"
                        className="w-full bg-[#0d1117] border border-white/10 focus:border-green-400 focus:outline-none h-11 px-3 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors"
                      />
                      <p className="text-[10px] text-white/25 mt-1.5">Upload a thumbnail to Google Drive or any image host and paste the URL here.</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleAdd}
                      disabled={!newSrc.trim() || uploading}
                      className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black uppercase tracking-widest py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Add Link
                    </button>
                    <button
                      onClick={() => { setShowAdd(false); setNewSrc(""); setNewAlt(""); }}
                      className="px-6 text-white/60 hover:text-white border border-white/10 hover:border-white/30 rounded-lg text-xs uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Grid */}
            {activeTab === "photos" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="group relative bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
                    <div className="aspect-[4/3] bg-white/5">
                      <img src={img.src} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-white/60 truncate">{img.alt}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(img.id)}
                      className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((vid) => {
                  const thumb = vid.thumbnail || getThumb(vid.src);
                  const embedUrl = getEmbedUrl(vid.src);
                  return (
                    <div
                      key={vid.id}
                      onClick={() => setActiveVideo(vid)}
                      className="group relative bg-[#161b22] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-green-500/30 transition-colors"
                    >
                      <div className="aspect-[4/3] bg-black flex items-center justify-center relative">
                        {thumb ? (
                          <img src={thumb} alt={vid.alt} className="w-full h-full object-cover" loading="lazy" />
                        ) : embedUrl ? (
                          <div className="w-full h-full bg-[#0d1117] flex flex-col items-center justify-center gap-2">
                            <Play size={28} className="text-[#E8A820]" fill="currentColor" />
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Click to play</span>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-[#0d1117] flex items-center justify-center">
                            <Video size={32} className="text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play size={20} className="text-white/60 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-white/60 truncate">{vid.alt}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(vid.id); }}
                        className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {((activeTab === "photos" && images.length === 0) || (activeTab === "videos" && videos.length === 0)) && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === "photos" ? (
                    <ImageIcon size={28} className="text-white/20" />
                  ) : (
                    <Video size={28} className="text-white/20" />
                  )}
                </div>
                <p className="text-white/40 text-sm">
                  No {activeTab === "photos" ? "images" : "videos"} yet. Add your first {activeTab === "photos" ? "image" : "video"}.
                </p>
              </div>
            )}

            {/* Lightbox for Admin */}
            <AnimatePresence>
              {activeVideo && (
                <motion.div
                  className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveVideo(null)}
                >
                  <button
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors z-50 cursor-pointer"
                    onClick={() => setActiveVideo(null)}
                  >
                    <X size={20} />
                  </button>

                  <div
                    className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  >
                    {getEmbedUrl(activeVideo.src) ? (                      <iframe
                        src={getEmbedUrl(activeVideo.src)!}
                        title={activeVideo.alt}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <video
                        src={activeVideo.src}
                        autoPlay
                        controls
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-bold uppercase tracking-widest text-center max-w-md truncate px-4">
                    {activeVideo.alt}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
