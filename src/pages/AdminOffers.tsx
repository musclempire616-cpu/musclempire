import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getOffers, addOffer, removeOffer, updateOffer, pullOffersFromSheets } from "@/lib/offersStore";
import { getCoupons, addCoupon, updateCoupon, removeCoupon, ensureCouponExists, pullFromSheets } from "@/lib/couponStore";
import type { Coupon } from "@/lib/couponStore";
import type { Offer } from "@/data/offers";
import { Plus, Trash2, Edit, LogOut, Users, Tag, Link, X, Check, Ticket, ToggleLeft, ToggleRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminGuard from "@/components/AdminGuard";
import { logout } from "@/lib/adminAuth";

export default function AdminOffers() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"offers" | "coupons">("offers");

  // ── Offers state ──────────────────────────────────────────
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // ── Coupons state ─────────────────────────────────────────
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [cpCode, setCpCode] = useState("");
  const [cpDiscount, setCpDiscount] = useState("");
  const [cpPlans, setCpPlans] = useState<string[]>([]);
  const [cpDesc, setCpDesc] = useState("");
  const [cpEnabled, setCpEnabled] = useState(true);

  const ALL_PLANS = ["Monthly", "Quarterly", "Half Yearly", "Yearly", "PT 12 Sessions", "PT Every Day", "Dietitian Plan"];
  const [savingCoupon, setSavingCoupon] = useState(false);

  function resetCouponForm() {
    setCpCode(""); setCpDiscount(""); setCpPlans([]); setCpDesc(""); setCpEnabled(true);
  }

  function handleAddCoupon() {
    if (!cpCode.trim() || !cpDiscount.trim()) { alert("Code and discount are required"); return; }
    setSavingCoupon(true);
    addCoupon({ code: cpCode.trim().toUpperCase(), discount: Number(cpDiscount), plans: cpPlans, description: cpDesc.trim(), enabled: cpEnabled });
    setCoupons(getCoupons());
    resetCouponForm();
    setShowAddCoupon(false);
    setSavingCoupon(false);
  }

  function handleUpdateCoupon() {
    if (!editingCoupon) return;
    updateCoupon(editingCoupon.id, editingCoupon);
    setCoupons(getCoupons());
    setEditingCoupon(null);
  }

  function handleRemoveCoupon(id: string) {
    if (confirm("Delete this coupon?")) {
      removeCoupon(id);
      setCoupons(getCoupons());
    }
  }

  function toggleCoupon(id: string, enabled: boolean) {
    updateCoupon(id, { enabled });
    setCoupons(getCoupons());
  }

  // Form states
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState("");
  const [badge, setBadge] = useState("");
  const [validTill, setValidTill] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [offerStatus, setOfferStatus] = useState<"active" | "upcoming" | "expired">("active");
  const [image, setImage] = useState("");
  const [isFeatured, setIsFeatured] = useState(true);
  const [showInPopup, setShowInPopup] = useState(true);

  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    // Always pull fresh from Sheets on admin panel load (cross-device sync)
    const handler = () => setOffers(getOffers());
    const couponHandler = () => setCoupons(getCoupons());
    window.addEventListener("offersUpdated", handler);
    window.addEventListener("couponsUpdated", couponHandler);

    // Show cached immediately
    setOffers(getOffers());
    setCoupons(getCoupons());

    // Always force pull from Sheets on admin load — ignore cache TTL
    setSyncing(true);
    Promise.all([
      pullOffersFromSheets().then(() => setOffers(getOffers())),
      pullFromSheets().then((freshCoupons) => setCoupons(freshCoupons)),
    ]).finally(() => setSyncing(false));

    return () => {
      window.removeEventListener("offersUpdated", handler);
      window.removeEventListener("couponsUpdated", couponHandler);
    };
  }, []);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setDescription("");
    setDiscount("");
    setBadge("");
    setValidTill("");
    setCtaText("");
    setWhatsappMessage("");
    setCouponCode("");
    setOfferStatus("active");
    setImage("");
    setIsFeatured(true);
    setShowInPopup(true);
  };



  const handleAdd = () => {
    if (!title.trim() || !description.trim()) { alert("Title and Description are required"); return; }
    const cleanCoupon = couponCode.trim().toUpperCase();
    addOffer({
      title: title.trim(), subtitle: subtitle.trim(), description: description.trim(),
      discount: discount.trim() || "SPECIAL OFFER", badge: badge.trim() || "Limited Time",
      validTill: validTill.trim() || "Limited Slots", ctaText: ctaText.trim() || "Claim Offer",
      whatsappMessage: whatsappMessage.trim() || `Hi Muscle Empire! I would like to claim the ${title}.`,
      isFeatured, showInPopup, image, couponCode: cleanCoupon || undefined, status: offerStatus,
    });
    if (cleanCoupon) {
      const discNum = parseInt(discount.replace(/\D/g, ""), 10) || 25;
      ensureCouponExists(cleanCoupon, discNum, `${title} Offer Coupon`);
      setCoupons(getCoupons());
    }
    setOffers(getOffers());
    resetForm();
    setShowAdd(false);
  };

  const handleUpdate = () => {
    if (!editingOffer) return;
    if (editingOffer.couponCode) {
      const discNum = parseInt((editingOffer.discount || "").replace(/\D/g, ""), 10) || 25;
      ensureCouponExists(editingOffer.couponCode, discNum, `${editingOffer.title} Offer Coupon`);
      setCoupons(getCoupons());
    }
    updateOffer(editingOffer.id, editingOffer);
    setOffers(getOffers());
    setEditingOffer(null);
  };

  const handleRemove = (id: string) => {
    if (confirm("Are you sure you want to delete this offer?")) {
      removeOffer(id);
      setOffers(getOffers());
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
                    <Tag size={20} className="text-green-400" />
                    Offers Manager
                    {syncing && <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest animate-pulse">Syncing...</span>}
                  </h1>
                  <p className="text-white/30 text-xs mt-0.5">Customize running & upcoming deals</p>
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
                    onClick={() => navigate("/sagarkharat/gallery")}
                    className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white border border-white/10 hover:border-white/30 rounded-lg text-xs uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Gallery
                  </button>
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate("/sagarkharat"); }}
                className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-400/30 rounded-lg text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-white/10">
            <button
              onClick={() => setActiveTab("offers")}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors -mb-px ${activeTab === "offers" ? "border-green-400 text-green-400" : "border-transparent text-white/40 hover:text-white/70"}`}
            >
              <Tag size={14} /> Offers
            </button>
            <button
              onClick={() => setActiveTab("coupons")}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors -mb-px ${activeTab === "coupons" ? "border-yellow-400 text-yellow-400" : "border-transparent text-white/40 hover:text-white/70"}`}
            >
              <Ticket size={14} /> Coupons
            </button>
          </div>

          {/* ── OFFERS TAB ── */}
          {activeTab === "offers" && (
            <>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-lg font-bold uppercase tracking-wider">Active Deals ({offers.length})</h2>
                <button
                  onClick={() => { resetForm(); setShowAdd(true); }}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-green-500/20"
                >
                  <Plus size={15} />
                  Add New Offer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map((offer) => (
                  <div key={offer.id} className="bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-white/20 transition-all">
                    <div className="h-40 bg-white/5 relative flex items-center justify-center overflow-hidden">
                      {offer.image ? (
                        <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                      ) : (
                        <Tag size={40} className="text-white/20" />
                      )}
                      <select
                        value={offer.status || "active"}
                        onChange={(e) => {
                          const newStatus = e.target.value as "active" | "upcoming" | "expired";
                          updateOffer(offer.id, { status: newStatus });
                          setOffers(getOffers());
                        }}
                        className={`absolute top-3 left-3 backdrop-blur-md text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border outline-none cursor-pointer z-10 ${
                          (offer.status || "active") === "active"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : offer.status === "upcoming"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        <option value="active" className="bg-[#161b22] text-emerald-400">● Active (Ongoing)</option>
                        <option value="upcoming" className="bg-[#161b22] text-blue-400">● Upcoming (Soon)</option>
                        <option value="expired" className="bg-[#161b22] text-rose-400">● Expired (Archived)</option>
                      </select>
                      <span className="absolute top-3 right-3 bg-green-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full z-10">{offer.discount}</span>
                    </div>
                    <div className="p-5 flex flex-col flex-1 gap-3">
                      <div>
                        <h3 className="font-black uppercase tracking-tight text-white text-base leading-tight mb-1">{offer.title}</h3>
                        <p className="text-white/40 text-xs font-semibold uppercase">{offer.subtitle || "Exclusive Deal"}</p>
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed flex-1">{offer.description}</p>
                      <p className="text-[11px] text-white/45">Valid till: <strong className="text-white/80">{(() => { try { const d = new Date(offer.validTill); return !isNaN(d.getTime()) && d.getFullYear() > 2000 ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : offer.validTill; } catch { return offer.validTill; } })()}</strong></p>
                      <div className="flex gap-2.5 pt-3 border-t border-white/10">
                        <button onClick={() => setEditingOffer(offer)} className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-white/5">
                          <Edit size={13} /> Edit
                        </button>
                        <button onClick={() => handleRemove(offer.id)} className="h-9 w-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/15 cursor-pointer" title="Delete Offer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── COUPONS TAB ── */}
          {activeTab === "coupons" && (
            <>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-lg font-bold uppercase tracking-wider">Coupon Codes ({coupons.length})</h2>
                <button
                  onClick={() => { resetCouponForm(); setShowAddCoupon(true); }}
                  className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-widest text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-yellow-400/20"
                >
                  <Plus size={15} /> Add Coupon
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {coupons.map(coupon => (
                  <div key={coupon.id} className={`bg-[#161b22] border rounded-2xl p-5 flex items-center gap-5 transition-all ${coupon.enabled ? "border-yellow-400/25 hover:border-yellow-400/50" : "border-white/10 opacity-60"}`}>
                    {/* Code */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-black text-white text-base tracking-widest uppercase">{coupon.code}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                          {coupon.discount}% OFF
                        </span>
                        {coupon.enabled ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Active</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">Disabled</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 truncate">{coupon.description || "—"}</p>
                      <p className="text-[11px] text-white/30 mt-1">
                        Valid on: {coupon.plans.length === 0 ? "All plans" : coupon.plans.join(", ")}
                      </p>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleCoupon(coupon.id, !coupon.enabled)}
                      className="shrink-0 transition-colors"
                      title={coupon.enabled ? "Disable coupon" : "Enable coupon"}
                    >
                      {coupon.enabled
                        ? <ToggleRight size={32} className="text-green-400" />
                        : <ToggleLeft size={32} className="text-white/20" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingCoupon(coupon)}
                      className="shrink-0 w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-colors cursor-pointer"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveCoupon(coupon.id)}
                      className="shrink-0 w-9 h-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg border border-red-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {coupons.length === 0 && (
                  <div className="text-center py-16 text-white/20 text-sm">No coupons yet. Add one above.</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal: Add Coupon */}
        <AnimatePresence>
          {showAddCoupon && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
              >
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2"><Ticket size={15} className="text-yellow-400" /> Add Coupon</h3>
                  <button onClick={() => setShowAddCoupon(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Code</label>
                      <input value={cpCode} onChange={e => setCpCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE25" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm font-bold tracking-widest outline-none focus:border-yellow-400/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Discount %</label>
                      <input value={cpDiscount} onChange={e => setCpDiscount(e.target.value)} type="number" min="1" max="100" placeholder="e.g. 25" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-yellow-400/50 transition-colors" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Description (optional)</label>
                    <input value={cpDesc} onChange={e => setCpDesc(e.target.value)} placeholder="e.g. 25% off for new members" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-yellow-400/50 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Valid on Plans (leave empty = all plans)</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PLANS.map(plan => (
                        <button key={plan} type="button"
                          onClick={() => setCpPlans(prev => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan])}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors ${cpPlans.includes(plan) ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white/50 border-white/10 hover:border-yellow-400/40"}`}
                        >{plan}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-sm font-bold text-white/70">Enable immediately</span>
                    <button type="button" onClick={() => setCpEnabled(p => !p)}>
                      {cpEnabled ? <ToggleRight size={28} className="text-green-400" /> : <ToggleLeft size={28} className="text-white/20" />}
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                  <button onClick={handleAddCoupon} disabled={savingCoupon} className="flex-1 h-11 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <Check size={15} /> {savingCoupon ? "Saving..." : "Add Coupon"}
                  </button>
                  <button onClick={() => setShowAddCoupon(false)} className="px-6 h-11 bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-xs rounded-xl border border-white/5 cursor-pointer">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Edit Coupon */}
        <AnimatePresence>
          {editingCoupon && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
              >
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2"><Edit size={15} className="text-yellow-400" /> Edit Coupon</h3>
                  <button onClick={() => setEditingCoupon(null)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Code</label>
                      <input value={editingCoupon.code} onChange={e => setEditingCoupon({...editingCoupon, code: e.target.value.toUpperCase()})} className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm font-bold tracking-widest outline-none focus:border-yellow-400/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Discount %</label>
                      <input value={editingCoupon.discount} onChange={e => setEditingCoupon({...editingCoupon, discount: Number(e.target.value)})} type="number" min="1" max="100" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-yellow-400/50 transition-colors" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Description</label>
                    <input value={editingCoupon.description || ""} onChange={e => setEditingCoupon({...editingCoupon, description: e.target.value})} className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-yellow-400/50 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Valid on Plans</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PLANS.map(plan => (
                        <button key={plan} type="button"
                          onClick={() => setEditingCoupon({...editingCoupon, plans: editingCoupon.plans.includes(plan) ? editingCoupon.plans.filter(p => p !== plan) : [...editingCoupon.plans, plan]})}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors ${editingCoupon.plans.includes(plan) ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white/50 border-white/10 hover:border-yellow-400/40"}`}
                        >{plan}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-sm font-bold text-white/70">Enabled</span>
                    <button type="button" onClick={() => setEditingCoupon({...editingCoupon, enabled: !editingCoupon.enabled})}>
                      {editingCoupon.enabled ? <ToggleRight size={28} className="text-green-400" /> : <ToggleLeft size={28} className="text-white/20" />}
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                  <button onClick={handleUpdateCoupon} className="flex-1 h-11 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <Check size={15} /> Save Changes
                  </button>
                  <button onClick={() => setEditingCoupon(null)} className="px-6 h-11 bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-xs rounded-xl border border-white/5 cursor-pointer">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAdd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8"
              >
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                    <Plus size={16} className="text-green-400" /> Add New Offer
                  </h3>
                  <button onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Image URL — first so it's always visible */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-green-400 uppercase tracking-wider font-bold">Offer Banner Image URL</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 bg-white/5 border border-green-400/30 rounded-xl px-3 py-2.5">
                        <Link size={14} className="text-green-400 shrink-0" />
                        <input
                          type="url"
                          value={image}
                          onChange={e => setImage(e.target.value)}
                          placeholder="https://i.ibb.co/... paste image URL here"
                          className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-white/30"
                        />
                        {image && <button onClick={() => setImage("")} className="text-white/30 hover:text-red-400 transition-colors"><X size={14} /></button>}
                      </div>
                      {image && !image.startsWith("data:") && (
                        <img src={image} alt="preview" className="w-full h-32 object-cover rounded-xl border border-white/10" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                      <p className="text-[10px] text-white/30">Upload to <span className="text-green-400 font-bold">imgbb.com</span> → copy Direct Link → paste here. Syncs across all devices.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Offer Title</label>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="e.g. New Member Transformation" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Subtitle</label>
                      <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} type="text" placeholder="e.g. Unlock Your Physique" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter details of what is included in this offer..." rows={3} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-400/50 transition-colors resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Discount Badge</label>
                      <input value={discount} onChange={(e) => setDiscount(e.target.value)} type="text" placeholder="e.g. 25% OFF" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Badge Text</label>
                      <input value={badge} onChange={(e) => setBadge(e.target.value)} type="text" placeholder="e.g. Limited Time Special" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <label className="text-xs text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Ticket size={14} /> Coupon Code for this Offer
                    </label>
                    <select value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                      className="h-10 bg-black/40 border border-amber-500/40 text-amber-300 rounded-xl px-3 text-sm font-mono tracking-widest font-black uppercase outline-none focus:border-amber-400 transition-colors cursor-pointer">
                      <option value="">— No coupon —</option>
                      {coupons.filter(c => c.enabled).map(c => (
                        <option key={c.id} value={c.code}>{c.code} ({c.discount}% OFF)</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-amber-300/70">
                      Select an existing coupon code to attach to this offer.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Valid Until</label>
                      <input value={validTill} onChange={(e) => setValidTill(e.target.value)} type="date" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors text-white" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">CTA Text</label>
                      <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} type="text" placeholder="e.g. Claim Discount" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Offer Status</label>
                    <select
                      value={offerStatus}
                      onChange={(e) => setOfferStatus(e.target.value as "active" | "upcoming" | "expired")}
                      className="h-10 bg-[#161b22] border border-white/10 text-white rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors cursor-pointer"
                    >
                      <option value="active">Active (Ongoing Offers section)</option>
                      <option value="upcoming">Upcoming (Coming Soon section)</option>
                      <option value="expired">Expired (Archived section)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">WhatsApp Message</label>
                    <input value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} type="text" placeholder="Enter predefined WhatsApp message..." className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white/70">Show in Public Popup</span>
                      <span className="text-[10px] text-white/40">If enabled, this offer will show in the main entry popup</span>
                    </div>
                    <button type="button" onClick={() => setShowInPopup(p => !p)}>
                      {showInPopup ? <ToggleRight size={28} className="text-green-400" /> : <ToggleLeft size={28} className="text-white/20" />}
                    </button>
                  </div>

                </div>

                <div className="px-6 py-4 border-t border-white/10 flex gap-3 bg-white/[0.02]">
                  <button onClick={handleAdd} className="flex-1 h-11 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Check size={16} /> Add Offer
                  </button>
                  <button onClick={() => setShowAdd(false)} className="px-6 h-11 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-xs rounded-xl border border-white/5 cursor-pointer transition-colors">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Edit Offer */}
        <AnimatePresence>
          {editingOffer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8"
              >
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                    <Edit size={16} className="text-green-400" /> Edit Offer Details
                  </h3>
                  <button onClick={() => setEditingOffer(null)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Image URL — first so it's always visible */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-green-400 uppercase tracking-wider font-bold">Offer Banner Image URL</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 bg-white/5 border border-green-400/30 rounded-xl px-3 py-2.5">
                        <Link size={14} className="text-green-400 shrink-0" />
                        <input
                          type="url"
                          value={editingOffer.image || ""}
                          onChange={e => setEditingOffer({ ...editingOffer, image: e.target.value })}
                          placeholder="https://i.ibb.co/... paste image URL here"
                          className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-white/30"
                        />
                        {editingOffer.image && <button onClick={() => setEditingOffer({ ...editingOffer, image: "" })} className="text-white/30 hover:text-red-400 transition-colors"><X size={14} /></button>}
                      </div>
                      {editingOffer.image && !editingOffer.image.startsWith("data:") && (
                        <img src={editingOffer.image} alt="preview" className="w-full h-32 object-cover rounded-xl border border-white/10" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                      <p className="text-[10px] text-white/30">Upload to <span className="text-green-400 font-bold">imgbb.com</span> → copy Direct Link → paste here. Syncs across all devices.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Offer Title</label>
                      <input value={editingOffer.title} onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })} type="text" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Subtitle</label>
                      <input value={editingOffer.subtitle || ""} onChange={(e) => setEditingOffer({ ...editingOffer, subtitle: e.target.value })} type="text" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Description</label>
                    <textarea value={editingOffer.description} onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })} rows={3} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-green-400/50 transition-colors resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Discount Badge</label>
                      <input value={editingOffer.discount} onChange={(e) => setEditingOffer({ ...editingOffer, discount: e.target.value })} type="text" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Badge Text</label>
                      <input value={editingOffer.badge} onChange={(e) => setEditingOffer({ ...editingOffer, badge: e.target.value })} type="text" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <label className="text-xs text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Ticket size={14} /> Coupon Code for this Offer
                    </label>
                    <select value={editingOffer.couponCode || ""} onChange={(e) => setEditingOffer({ ...editingOffer, couponCode: e.target.value })}
                      className="h-10 bg-black/40 border border-amber-500/40 text-amber-300 rounded-xl px-3 text-sm font-mono tracking-widest font-black uppercase outline-none focus:border-amber-400 transition-colors cursor-pointer">
                      <option value="">— No coupon —</option>
                      {coupons.filter(c => c.enabled).map(c => (
                        <option key={c.id} value={c.code}>{c.code} ({c.discount}% OFF)</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-amber-300/70">
                      Select an existing coupon code to attach to this offer.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Valid Until</label>
                      <input value={editingOffer.validTill} onChange={(e) => setEditingOffer({ ...editingOffer, validTill: e.target.value })} type="date" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors text-white" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-white/50 uppercase tracking-wider font-bold">CTA Text</label>
                      <input value={editingOffer.ctaText} onChange={(e) => setEditingOffer({ ...editingOffer, ctaText: e.target.value })} type="text" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Offer Status</label>
                    <select
                      value={editingOffer.status || "active"}
                      onChange={(e) => setEditingOffer({ ...editingOffer, status: e.target.value as "active" | "upcoming" | "expired" })}
                      className="h-10 bg-[#161b22] border border-white/10 text-white rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors cursor-pointer"
                    >
                      <option value="active">Active (Ongoing Offers section)</option>
                      <option value="upcoming">Upcoming (Coming Soon section)</option>
                      <option value="expired">Expired (Archived section)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">WhatsApp Message</label>
                    <input value={editingOffer.whatsappMessage} onChange={(e) => setEditingOffer({ ...editingOffer, whatsappMessage: e.target.value })} type="text" className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm outline-none focus:border-green-400/50 transition-colors" />
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white/70">Show in Public Popup</span>
                      <span className="text-[10px] text-white/40">If enabled, this offer will show in the main entry popup</span>
                    </div>
                    <button type="button" onClick={() => setEditingOffer({ ...editingOffer, showInPopup: !editingOffer.showInPopup })}>
                      {editingOffer.showInPopup !== false ? <ToggleRight size={28} className="text-green-400" /> : <ToggleLeft size={28} className="text-white/20" />}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Offer Banner Image URL</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                        <Link size={14} className="text-white/30 shrink-0" />
                        <input
                          type="url"
                          value={editingOffer.image || ""}
                          onChange={e => setEditingOffer({ ...editingOffer, image: e.target.value })}
                          placeholder="https://i.ibb.co/... or any image URL"
                          className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-white/20"
                        />
                        {editingOffer.image && <button onClick={() => setEditingOffer({ ...editingOffer, image: "" })} className="text-white/30 hover:text-red-400 transition-colors"><X size={14} /></button>}
                      </div>
                      {editingOffer.image && !editingOffer.image.startsWith("data:") && (
                        <img src={editingOffer.image} alt="preview" className="w-full h-32 object-cover rounded-xl border border-white/10" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                      <p className="text-[10px] text-white/30">Paste a hosted image URL (e.g. from <span className="text-green-400">imgbb.com</span>). This syncs across all devices.</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex gap-3 bg-white/[0.02]">
                  <button onClick={handleUpdate} className="flex-1 h-11 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Check size={16} /> Save Changes
                  </button>
                  <button onClick={() => setEditingOffer(null)} className="px-6 h-11 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-xs rounded-xl border border-white/5 cursor-pointer transition-colors">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminGuard>
  );
}
