import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { fetchFresh, updateRecord, type AssessmentData } from "@/lib/sheets";
import { ArrowLeft, Download, MessageCircle, CheckCircle2, Save, LogOut, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import AdminGuard from "@/components/AdminGuard";
import { logout } from "@/lib/adminAuth";
import { getSelectedAssessment, clearSelectedAssessment } from "@/lib/adminStore";

// Bottom fields — Suggestion only (fixed)
const EXTRA_FIELDS = [
  { key: "preWorkout", label: "Pre-Workout" },
  { key: "postWorkout", label: "Post-Workout" },
  { key: "supplementsPlan", label: "Supplements" },
  { key: "notes", label: "Notes" },
] as const;

// Dynamic meal entry type
type MealEntry = { id: string; meal: string; time: string; suggestion: string };

function clean(val: string | undefined | null): string {
  const s = String(val ?? "").trim();
  if (!s || s === "0" || s === "undefined" || s === "null") return "--";
  if (s.includes("1899") || s.startsWith("Sat Dec") || s.startsWith("Sun Dec") ||
      s.includes("GMT+") || s.includes("GMT-")) {
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {}
  }
  return s;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2 border-b border-white/5">
      <span className="text-white/40 text-xs uppercase tracking-widest font-bold w-40 shrink-0">{label}</span>
      <span className="text-white text-sm break-all min-w-0">{clean(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#161b22] border border-white/10 rounded-xl p-5 mb-4">
      <h3 className="text-green-400 font-black uppercase tracking-widest text-xs mb-4 pb-2 border-b border-white/10">{title}</h3>
      {children}
    </div>
  );
}

// Parse stored meals JSON from plan
function parseMeals(raw: string): MealEntry[] {
  try { return JSON.parse(raw) as MealEntry[]; } catch { return []; }
}

export default function AdminCustomer({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const [customer, setCustomer] = useState<AssessmentData | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [rowIdx, setRowIdx] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // PRIMARY: module-level store — set synchronously before navigation, always correct
    const stored = getSelectedAssessment();
    if (stored) {
      clearSelectedAssessment();
      setCustomer(stored);
      loadPlanFromRecord(stored);
      const ri = stored._rowIndex;
      if (ri !== undefined) {
        setRowIdx(ri);
        if (stored.status === "New") {
          updateRecord(ri, { status: "In Progress" });
          setCustomer(c => c ? { ...c, status: "In Progress" } : c);
        }
      }
      return;
    }
    // FALLBACK: direct URL access — fetch from Sheets
    localStorage.removeItem("me_assessments_ts");
    fetchFresh().then(async (data) => {
      const paramId = params.id;
      const ni = parseInt(paramId);
      let idx = data.findIndex(d => (d._rowIndex ?? -1) === ni);
      let found = idx >= 0 ? data[idx] : undefined;
      if (!found && !isNaN(ni) && data[ni]) { idx = ni; found = data[ni]; }
      if (!found) {
        idx = data.findIndex(d => String(d.id) === paramId);
        found = idx >= 0 ? data[idx] : undefined;
      }      if (!found && !isNaN(ni) && data[ni]) { idx = ni; found = data[ni]; }
      if (!found) {
        idx = data.findIndex(d => String(d.id) === paramId);
        found = idx >= 0 ? data[idx] : undefined;
      }
      if (!found || idx < 0) return;
      setRowIdx(idx);
      if (found.status === "New") {
        await updateRecord(idx, { status: "In Progress" });
        found = { ...found, status: "In Progress" };
      }
      setCustomer(found);
      loadPlanFromRecord(found);
    });
  }, [params.id]);

  function loadPlanFromRecord(rec: AssessmentData) {
    // Try to load dynamic meals (diet plan) from earlyMorning field as JSON
    const raw = (rec as Record<string, unknown>)["earlyMorning"] as string || "";
    const parsed = parseMeals(raw);
    if (parsed.length > 0) {
      setMeals(parsed);
    } else {
      setMeals([]);
    }
    const e: Record<string, string> = {};
    EXTRA_FIELDS.forEach(f => { e[f.key] = (rec as Record<string, unknown>)[f.key] as string || ""; });
    setExtras(e);
  }

  const addMeal = () => {
    setMeals(m => [...m, { id: Date.now().toString(), meal: "", time: "", suggestion: "" }]);
  };

  const removeMeal = (id: string) => {
    setMeals(m => m.filter(e => e.id !== id));
  };

  const updateMeal = (id: string, field: keyof MealEntry, value: string) => {
    setMeals(m => m.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSave = async () => {
    if (!customer) return;
    setSaving(true);
    const sheetsIdx = customer._rowIndex ?? rowIdx;
    // Store dynamic meals as JSON in earlyMorning field
    const updates: Partial<AssessmentData> = {
      earlyMorning: JSON.stringify(meals),
      status: "In Progress",
      ...Object.fromEntries(EXTRA_FIELDS.map(f => [f.key, extras[f.key] || ""])),
    };
    await updateRecord(sheetsIdx, updates);
    setCustomer(c => c ? { ...c, status: "In Progress" } : c);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleMarkComplete = async () => {
    if (!customer) return;
    const sheetsIdx = customer._rowIndex ?? rowIdx;
    await updateRecord(sheetsIdx, { status: "Completed" });
    setCustomer(c => c ? { ...c, status: "Completed" } : c);
  };

  const sendPDF = async () => {
    if (!customer) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 12;
    const usableW = W - margin * 2;
    let y = 10;

    // Load logo (non-blocking — PDF generates even if logo fails)
    let logoDataUrl = "";
    try {
      const logoModule = await import("@/assets/images/logo.jpeg");
      const response = await fetch(logoModule.default);
      const blob = await response.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
    } catch { logoDataUrl = ""; }

    // Logo ABOVE the yellow banner (left side)
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "JPEG", margin, y, 22, 22);
    }

    // Yellow banner — starts after logo height
    doc.setFillColor(255, 208, 0);
    doc.rect(margin + 24, y, usableW - 24, 22, "F");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 30, 5);
    doc.text("MUSCLE EMPIRE NUTRITION", margin + 24 + (usableW - 24) / 2, y + 14, { align: "center" });
    y += 24;

    // Contact line — larger, bold, spaced like the template
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Office : - 9137870108", margin, y + 2);
    doc.text("|", 72, y + 2);
    doc.text("Sagar Kharat : -  9773053632", 77, y + 2);
    doc.text("|", 152, y + 2);
    doc.text("8779682084", 156, y + 2);
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // Patient info
    doc.setFontSize(8.5); doc.setTextColor(0, 0, 0);
    const lbl = (text: string, val: string, x: number, yy: number, lw: number) => {
      doc.setFont("helvetica", "bold"); doc.text(text, x, yy);
      doc.setFont("helvetica", "normal"); doc.text(String(val || "--"), x + lw, yy);
    };

    lbl("Name :", customer.name, margin, y, 13);
    lbl("Date :", customer.date, 105, y, 10);
    lbl("Age :", (customer.age || "--") + " yrs", 160, y, 8);
    y += 6;
    lbl("Gender :", customer.gender || "--", margin, y, 15);
    lbl("Weight :", (customer.weight || "--") + " kg", 60, y, 14);
    lbl("Height :", (customer.height || "--") + " cm", 110, y, 14);
    y += 6;
    lbl("BMI :", (customer.bmi || "--") + " (" + (customer.bmiCategory || "--") + ")", margin, y, 8);
    y += 6;
    lbl("Wake-up :", clean(customer.wakeTime), margin, y, 17);
    lbl("Bed Time :", clean(customer.bedTime), 75, y, 18);
    lbl("Food Pref :", customer.foodPref || "--", 145, y, 19);
    y += 6;
    lbl("College :", clean(customer.collegeTime).substring(0, 15), margin, y, 16);
    lbl("Workout :", clean(customer.workoutTime).substring(0, 15), 75, y, 17);
    lbl("Target :", (customer.targetWeight || "--") + " kg", 145, y, 13);
    y += 6;
    lbl("Remark :", customer.remarks || customer.goals || "--", margin, y, 16);
    y += 7;

    doc.line(margin, y, W - margin, y);
    y += 5;

    // 4-column Diet table: Time(history) | Foods Items/History | Time(diet) | Suggestion
    const histTimeW = 18;
    const histFoodW = 52;
    const dietTimeW = 22;
    const suggColW = usableW - histTimeW - histFoodW - dietTimeW;
    const mealColW = 40; // label column width for the "Additional" section

    doc.setFillColor(50, 30, 5);
    doc.rect(margin, y, usableW, 7, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.text("Time", margin + 1, y + 5);
    doc.text("Foods Items / History", margin + histTimeW + 1, y + 5);
    doc.text("Time", margin + histTimeW + histFoodW + 1, y + 5);
    doc.text("Suggestion", margin + histTimeW + histFoodW + dietTimeW + 1, y + 5);
    y += 7;

    doc.setTextColor(0, 0, 0); doc.setFontSize(7.5); doc.setDrawColor(180, 180, 180);

    const historyLines = (customer.foodHistory || "").split("\n").filter(l => l.trim());
    const dietRows = meals.filter(m => m.meal || m.suggestion);
    const maxRows = Math.max(historyLines.length, dietRows.length, 1);

    let altRow = false;
    for (let i = 0; i < maxRows; i++) {
      const histLine = historyLines[i] || "";
      const histMatch = histLine.match(/^(\S+(?:am|pm))\s*[:-]?\s*(.*)/i);
      const histTime = (histMatch ? histMatch[1] : "").substring(0, 8);
      const histFood = histMatch ? histMatch[2].trim() : histLine.trim();

      const dietRow = dietRows[i];
      const dietMeal = (dietRow?.meal || "") + (dietRow?.time ? " (" + dietRow.time + ")" : "");
      const dietSugg = dietRow?.suggestion || "";

      const histFoodSafe = histFood || " ";
      const dietSuggSafe = dietSugg || " ";

      const histFoodLines = doc.splitTextToSize(histFoodSafe, histFoodW - 3) as string[];
      const dietMealLines = doc.splitTextToSize(dietMeal || " ", dietTimeW - 2) as string[];
      const suggLines = doc.splitTextToSize(dietSuggSafe, suggColW - 3) as string[];
      const rowH = Math.max(7, Math.max(histFoodLines.length, dietMealLines.length, suggLines.length) * 5 + 2);

      if (y + rowH > 278) { doc.addPage(); y = 15; }

      if (altRow) { doc.setFillColor(255, 252, 220); doc.rect(margin, y, usableW, rowH, "F"); }
      altRow = !altRow;

      doc.rect(margin, y, histTimeW, rowH);
      doc.rect(margin + histTimeW, y, histFoodW, rowH);
      doc.rect(margin + histTimeW + histFoodW, y, dietTimeW, rowH);
      doc.rect(margin + histTimeW + histFoodW + dietTimeW, y, suggColW, rowH);

      doc.setFont("helvetica", "normal");
      if (histTime) doc.text(histTime, margin + 1, y + 5);
      histFoodLines.forEach((line, li) => doc.text(line, margin + histTimeW + 1, y + 5 + li * 5));
      doc.setFont("helvetica", "bold");
      dietMealLines.forEach((line, li) => doc.text(line, margin + histTimeW + histFoodW + 1, y + 5 + li * 5));
      doc.setFont("helvetica", "normal");
      suggLines.forEach((line, li) => doc.text(line, margin + histTimeW + histFoodW + dietTimeW + 1, y + 5 + li * 5));
      y += rowH;
    }

    // Additional section
    const hasExtra = EXTRA_FIELDS.some(f => extras[f.key]);
    if (hasExtra) {
      if (y + 15 > 278) { doc.addPage(); y = 15; }
      doc.setFillColor(50, 30, 5);
      doc.rect(margin, y, usableW, 6, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text("Additional", margin + 2, y + 4.5);
      doc.text("Suggestion", margin + mealColW + 2, y + 4.5);
      y += 6;
      doc.setTextColor(0, 0, 0); doc.setFontSize(8); altRow = false;
      EXTRA_FIELDS.filter(f => extras[f.key]).forEach((f) => {
        const lines = doc.splitTextToSize(extras[f.key], usableW - mealColW - 4) as string[];
        const rowH = Math.max(7, lines.length * 5 + 3);
        if (y + rowH > 278) { doc.addPage(); y = 15; }
        if (altRow) { doc.setFillColor(240, 240, 255); doc.rect(margin, y, usableW, rowH, "F"); }
        altRow = !altRow;
        doc.rect(margin, y, mealColW, rowH);
        doc.rect(margin + mealColW, y, usableW - mealColW, rowH);
        doc.setFont("helvetica", "bold"); doc.text(f.label, margin + 2, y + 5);
        doc.setFont("helvetica", "normal");
        lines.forEach((line, i) => doc.text(line, margin + mealColW + 2, y + 5 + i * 5));
        y += rowH;
      });
    }

    doc.save("Diet_Sheet_" + customer.name.replace(/\s+/g, "_") + ".pdf");
    setTimeout(() => {
      const phone = String(customer.phone).replace(/\D/g, "");
      const waPhone = phone.startsWith("91") ? phone : "91" + phone;
      const msg = encodeURIComponent("Hello " + customer.name + ",\n\nYour personalized diet plan has been prepared. Please find the attached PDF.\n\nThank you,\nMuscle Empire Nutrition Team");
      window.open("https://wa.me/" + waPhone + "?text=" + msg, "_blank");
    }, 1200);
  };

  const sendWhatsApp = () => {
    if (!customer) return;
    const mealText = meals.filter(m => m.meal || m.suggestion)
      .map(m => "*" + (m.meal || "Meal") + (m.time ? " (" + m.time + ")" : "") + ":*\n" + (m.suggestion || "")).join("\n\n");
    const extraText = EXTRA_FIELDS.filter(f => extras[f.key])
      .map(f => "*" + f.label + ":*\n" + extras[f.key]).join("\n\n");
    const msg = "Hello " + customer.name + ",\n\nYour personalized diet plan:\n\n" + mealText +
      (extraText ? "\n\n" + extraText : "") + "\n\nThank you,\nMuscle Empire Nutrition Team";
    const phone = String(customer.phone).replace(/\D/g, "");
    const waPhone = phone.startsWith("91") ? phone : "91" + phone;
    window.open("https://wa.me/" + waPhone + "?text=" + encodeURIComponent(msg), "_blank");
    try { navigator.clipboard.writeText(msg); } catch {}
  };

  if (!customer) {
    return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white/40">Loading assessment...</div>;
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#0d1117] text-white">
        <div className="bg-[#161b22] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => navigate("/pronectar-admin-2026/dashboard")}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="flex items-center gap-4">
            <span className={"px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border " + (
              customer.status === "Completed" ? "bg-green-400/15 text-green-400 border-green-400/30" :
              customer.status === "In Progress" ? "bg-blue-400/15 text-blue-400 border-blue-400/30" :
              "bg-yellow-400/15 text-yellow-400 border-yellow-400/30"
            )}>{customer.status || "New"}</span>
            <button onClick={() => { logout(); navigate("/pronectar-admin-2026"); }}
              className="flex items-center gap-1.5 text-red-400/60 hover:text-red-400 text-xs transition-colors">
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-black text-white mb-1">{customer.name}</h1>
            <p className="text-white/40 text-sm mb-8">{customer.phone} &middot; Submitted {customer.date}</p>
          </motion.div>

          <Section title="Personal Information">
            <InfoRow label="Full Name" value={customer.name} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Age" value={customer.age} />
            <InfoRow label="Gender" value={customer.gender} />
          </Section>

          <Section title="Body Measurements">
            <InfoRow label="Weight" value={customer.weight + " kg"} />
            <InfoRow label="Height" value={customer.height + " cm"} />
            <InfoRow label="BMI" value={customer.bmi} />
            <InfoRow label="BMI Category" value={customer.bmiCategory} />
            <InfoRow label="Target Weight" value={customer.targetWeight ? customer.targetWeight + " kg" : "--"} />
            <InfoRow label="Weight Change" value={customer.weightChange ? customer.weightChange + " kg" : "--"} />
          </Section>

          <Section title="Lifestyle">
            <InfoRow label="Wake-up Time" value={customer.wakeTime} />
            <InfoRow label="Bed Time" value={customer.bedTime} />
            <InfoRow label="Sleep Duration" value={customer.sleepDuration ? customer.sleepDuration + " hrs" : "--"} />
            <InfoRow label="Workout Time" value={customer.workoutTime} />
            <InfoRow label="Food Preference" value={customer.foodPref} />
            <InfoRow label="College Timing" value={customer.collegeTime} />
            <InfoRow label="Work Timing" value={customer.workTime} />
          </Section>

          <Section title="Health and Goals">
            <InfoRow label="Goals" value={customer.goals} />
            <InfoRow label="Medical Conditions" value={customer.medicalConditions} />
            <InfoRow label="Allergies" value={customer.allergies} />
            <InfoRow label="Supplements" value={customer.supplements} />
            <InfoRow label="Remarks" value={customer.remarks} />
          </Section>

          {/* Food History — always show */}
          <Section title="Food Items / History (Last 7 Days)">
            {customer.foodHistory && !customer.foodHistory.startsWith("[") ? (
              <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{customer.foodHistory}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No food history submitted.</p>
            )}
          </Section>

          {/* Diet Plan Editor */}
          <div className="bg-[#161b22] border border-green-400/20 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
              <h3 className="text-green-400 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Diet Plan
              </h3>
              <button onClick={addMeal}
                className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-400/30 text-green-400 font-black text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-colors">
                <Plus size={14} /> Add Meal
              </button>
            </div>

            {/* Customer food history reference */}
            {customer.foodHistory && !customer.foodHistory.startsWith("[") && (
              <div className="mb-5 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-4">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-2">Customer Food History (Last 7 Days) — Reference</p>
                <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">{customer.foodHistory}</pre>
              </div>
            )}

            {meals.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">
                Click "+ Add Meal" to add meal entries to the diet plan.
              </div>
            )}

            <div className="space-y-3">
              {meals.map((entry, idx) => (
                <div key={entry.id} className="bg-[#0d1117] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Meal {idx + 1}</span>
                    <button onClick={() => removeMeal(entry.id)}
                      className="text-red-400/50 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">Meal Name</label>
                      <input type="text" placeholder="e.g. Breakfast"
                        value={entry.meal}
                        onChange={e => updateMeal(entry.id, "meal", e.target.value)}
                        className="w-full bg-[#161b22] border border-white/10 focus:border-green-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">Time</label>
                      <input type="text" placeholder="e.g. 8:00 AM"
                        value={entry.time}
                        onChange={e => updateMeal(entry.id, "time", e.target.value)}
                        className="w-full bg-[#161b22] border border-white/10 focus:border-green-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">Food Suggestion</label>
                      <textarea rows={2} placeholder="Enter food details..."
                        value={entry.suggestion}
                        onChange={e => updateMeal(entry.id, "suggestion", e.target.value)}
                        className="w-full bg-[#161b22] border border-white/10 focus:border-green-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg resize-none transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra fields */}
          <div className="bg-[#161b22] border border-blue-400/20 rounded-xl p-5 mb-6">
            <h3 className="text-blue-400 font-black uppercase tracking-widest text-sm mb-5 pb-3 border-b border-white/10">
              Pre/Post Workout, Supplements &amp; Notes
            </h3>
            <div className="space-y-4">
              {EXTRA_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-black uppercase tracking-widest text-blue-400 mb-2">{f.label}</label>
                  <textarea rows={2} placeholder={"Enter " + f.label.toLowerCase() + " suggestion..."}
                    value={extras[f.key] || ""}
                    onChange={e => setExtras(ex => ({ ...ex, [f.key]: e.target.value }))}
                    className="w-full bg-[#0d1117] border border-white/10 focus:border-blue-400 focus:outline-none px-3 py-2 text-white placeholder:text-white/20 text-sm rounded-lg resize-none transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-wider py-3 rounded-xl text-xs transition-colors disabled:opacity-60">
              <Save size={14} />
              {saving ? "Saving..." : saved ? "Saved" : "Save Draft"}
            </button>
            <button onClick={sendPDF}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-black uppercase tracking-wider py-3 rounded-xl text-xs transition-colors">
              <Download size={14} />
              Send PDF
            </button>
            <button onClick={sendWhatsApp}
              className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black uppercase tracking-wider py-3 rounded-xl text-xs transition-colors">
              <MessageCircle size={14} />
              Send WhatsApp
            </button>
            <button onClick={handleMarkComplete} disabled={customer.status === "Completed"}
              className={"flex items-center justify-center gap-2 font-black uppercase tracking-wider py-3 rounded-xl text-xs transition-colors " + (
                customer.status === "Completed"
                  ? "bg-green-500/20 text-green-400 border border-green-400/30 cursor-default"
                  : "bg-white/10 hover:bg-green-500 hover:text-black text-white"
              )}>
              <CheckCircle2 size={14} />
              {customer.status === "Completed" ? "Completed" : "Mark Complete"}
            </button>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
