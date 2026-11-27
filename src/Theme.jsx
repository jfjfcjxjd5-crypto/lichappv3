import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, ImagePlus, Check } from "lucide-react";
import { compress, idbGet, idbSet, idbDel, EASE, ui } from "./lib";

export const THEMES = {
  aurora: { name: "Cực quang", dark: true, sw: "linear-gradient(135deg,#7c3aed,#14b8a6)", bg: "radial-gradient(60% 50% at 15% 8%,rgba(124,58,237,.55),transparent),radial-gradient(50% 45% at 92% 18%,rgba(20,184,166,.45),transparent),radial-gradient(60% 50% at 70% 100%,rgba(59,130,246,.42),transparent),#05060f" },
  light: { name: "Sáng tối giản", dark: false, sw: "#eceff5", bg: "linear-gradient(160deg,#f8f8fb,#e8ebf2)" },
  cream: { name: "Kem ấm áp", dark: false, sw: "linear-gradient(135deg,#fcf5e8,#f1d9bf)", bg: "radial-gradient(60% 50% at 85% 0%,rgba(251,191,146,.5),transparent),linear-gradient(160deg,#fcf5e8,#f5e6d3)" },
  deep: { name: "Xanh sâu", dark: true, sw: "linear-gradient(135deg,#0a2f5c,#38bdf8)", bg: "radial-gradient(70% 50% at 20% 0%,rgba(56,189,248,.32),transparent),linear-gradient(170deg,#06183a,#0a2f5c 60%,#041226)" },
  custom: { name: "Ảnh của bạn", dark: true },
};
const LS = "lvtc-theme";

export function useTheme() {
  const [id, setId] = useState(() => {
    let v = null; try { v = localStorage.getItem(LS); } catch {}
    if (v && THEMES[v]) return v;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "aurora" : "light";
  });
  const [img, setImg] = useState(null);
  const last = useRef(null);
  const show = (b) => { if (last.current) URL.revokeObjectURL(last.current); last.current = URL.createObjectURL(b); setImg(last.current); };

  useEffect(() => { idbGet("bg-custom").then((b) => b && show(b)); return () => last.current && URL.revokeObjectURL(last.current); }, []);
  const dark = THEMES[id].dark;
  useEffect(() => {
    try { localStorage.setItem(LS, id); } catch {}
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [id, dark]);

  return {
    id, img, setId,
    async setCustom(file) { const b = await compress(file, 1600, 0.7); await idbSet("bg-custom", b); show(b); setId("custom"); },
    async clearCustom() { await idbDel("bg-custom"); if (last.current) URL.revokeObjectURL(last.current); last.current = null; setImg(null); if (id === "custom") setId("aurora"); },
  };
}

export function ThemeLayer({ th }) {
  const custom = th.id === "custom" && th.img;
  const bg = custom ? { backgroundImage: `url(${th.img})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: (THEMES[th.id].bg || THEMES.aurora.bg) };
  return (
    <AnimatePresence initial={false}>
      <motion.div key={custom ? "img" : th.id} className="fixed inset-0 -z-10" style={bg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        {custom && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />}
      </motion.div>
    </AnimatePresence>
  );
}

export function ThemePicker({ th }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const up = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try { await th.setCustom(f); } catch { alert("Không dùng được ảnh này, hãy thử ảnh khác."); }
    setBusy(false);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Theme và hình nền" className={`flex h-8 w-8 items-center justify-center rounded-full ${ui.chip} ${ui.press}`}><Palette size={15} /></button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.25, ease: EASE }}
              className="absolute right-0 z-40 mt-2 w-64 space-y-3 rounded-2xl border border-white/60 bg-white/80 p-3 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/80">
              <div className="text-sm font-semibold">Theme & Hình nền</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEMES).filter(([k]) => k !== "custom").map(([k, t]) => (
                  <button key={k} onClick={() => th.setId(k)} className={`rounded-xl p-1.5 text-left text-xs ${ui.press} ${th.id === k ? "ring-2 ring-blue-500" : ""}`}>
                    <div className="h-10 rounded-lg border border-black/10" style={{ background: t.sw }} />
                    <div className="mt-1 flex items-center justify-between px-0.5">{t.name}{th.id === k && <Check size={12} className="text-blue-500" />}</div>
                  </button>
                ))}
              </div>
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white ${ui.press} ${busy ? "pointer-events-none opacity-60" : ""}`}>
                <ImagePlus size={16} />{busy ? "Đang xử lý…" : "Tải ảnh nền của bạn"}
                <input type="file" accept="image/*" className="hidden" onChange={up} />
              </label>
              {th.img && (
                <div className="flex gap-2 text-sm">
                  <button onClick={() => th.setId("custom")} className={`flex-1 rounded-lg py-2 ${ui.soft} ${ui.press} ${th.id === "custom" ? "ring-2 ring-blue-500" : ""}`}>Dùng ảnh của tôi</button>
                  <button onClick={th.clearCustom} className={`rounded-lg px-3 py-2 text-red-500 ${ui.soft} ${ui.press}`}>Xóa</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
