import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Check, ArrowRight, Camera, ImagePlus, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { sb, ui, fmt, idbGet, idbSet, EASE, COLORS, uid, pad } from "./lib";

const { inp, press, soft, active } = ui;
const rowAnim = { layout: true, initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, x: -12 }, transition: { duration: 0.25, ease: EASE } };

/* ---------------- Đầu việc (có lặp hàng tuần) ---------------- */
export function Tasks({ items, dowLabel, onAdd, onToggle, onDel, onMove, onMoveAll }) {
  const [v, setV] = useState("");
  const [rep, setRep] = useState(false);
  const [ask, setAsk] = useState(null);
  const add = () => { const t = v.trim(); if (t) { onAdd(t, rep); setV(""); setRep(false); } };
  const open = items.filter((t) => !t.done && !t.recur).length;
  const opt = (on, label) => (
    <button onClick={() => setRep(on)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${press} ${rep === on ? active : "text-neutral-500"}`}>{label}</button>
  );
  return (
    <div>
      <div className="flex gap-2">
        <input className={inp} value={v} placeholder="Gõ việc, vd: 19h30 chạy bộ" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} aria-label="Thêm việc" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white ${press}`}><Plus size={18} /></button>
      </div>
      <div className={`mt-2 flex rounded-xl p-1 ${soft}`}>
        {opt(false, "Chỉ ngày này")}
        {opt(true, `Hàng tuần (mỗi ${dowLabel})`)}
      </div>
      {onMoveAll && open > 0 && (
        <button onClick={onMoveAll} className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 py-2 text-sm font-medium text-blue-500 ${press}`}>
          <ArrowRight size={15} />Dời {open} việc chưa xong sang hôm nay
        </button>
      )}
      <ul className="mt-3 space-y-1.5">
        {items.length === 0 && <li className="py-3 text-center text-sm text-neutral-500">Chưa có đầu việc nào</li>}
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.li key={t.id} {...rowAnim} className={`rounded-xl px-3 py-2.5 ${soft}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => onToggle(t)} aria-label="Hoàn thành" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${press} ${t.done ? "border-blue-500 bg-blue-500 text-white" : "border-neutral-300 dark:border-neutral-600"}`}>
                  {t.done && <Check size={14} strokeWidth={3} />}
                </button>
                <span className={`min-w-0 flex-1 break-words text-[15px] transition-opacity ${t.done ? "line-through opacity-45" : ""}`}>{t.text}</span>
                {t.recur && <Repeat size={13} aria-label="Lặp hàng tuần" className="shrink-0 text-blue-500" />}
                {onMove && !t.done && !t.recur && <button onClick={() => onMove(t)} aria-label="Dời sang hôm nay" title="Dời sang hôm nay" className={`p-1.5 text-blue-500 ${press}`}><ArrowRight size={16} /></button>}
                <button onClick={() => (t.recur ? setAsk(ask === t.id ? null : t.id) : onDel(t))} aria-label="Xóa" className={`p-1.5 text-neutral-500 ${press}`}><Trash2 size={16} /></button>
              </div>
              <AnimatePresence initial={false}>
                {ask === t.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                    <div className="mt-2.5 flex flex-wrap gap-2 text-sm">
                      <button onClick={() => { onDel(t, "today"); setAsk(null); }} className={`rounded-lg bg-red-500/10 px-3 py-1.5 font-medium text-red-500 ${press}`}>Xóa chỉ hôm nay</button>
                      <button onClick={() => { onDel(t, "from"); setAsk(null); }} className={`rounded-lg bg-red-500 px-3 py-1.5 font-medium text-white ${press}`}>Xóa từ tuần này trở đi</button>
                      <button onClick={() => setAsk(null)} className={`px-2 py-1.5 text-neutral-500 ${press}`}>Hủy</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ---------------- Thu & Chi + phân loại tùy chỉnh ---------------- */
export function Money({ items, cats, onAdd, onDel, onAddCat }) {
  const [amt, setAmt] = useState("");
  const [type, setType] = useState("chi");
  const [note, setNote] = useState("");
  const [cat, setCat] = useState(cats[0]?.id);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[1]);
  const sum = (t) => items.filter((i) => i.type === t).reduce((s, i) => s + i.amount, 0);
  const catOf = (id) => cats.find((c) => c.id === id) || { name: "Khác", color: "#8e8e93" };
  const add = () => { const a = Number(amt); if (!a) return; onAdd({ amount: a, type, note: note.trim(), cat }); setAmt(""); setNote(""); };
  const createCat = () => {
    const n = name.trim(); if (!n) return;
    const c = { id: uid(), name: n, color }; onAddCat(c); setCat(c.id); setName(""); setAdding(false);
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-green-500/15 p-3"><div className="text-xs text-neutral-500">Tổng thu</div><div className="text-lg font-semibold text-green-600">{fmt(sum("thu"))}</div></div>
        <div className="rounded-2xl bg-red-500/15 p-3"><div className="text-xs text-neutral-500">Tổng chi</div><div className="text-lg font-semibold text-red-500">{fmt(sum("chi"))}</div></div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input className={inp} inputMode="numeric" placeholder="Số tiền (đ)" value={amt ? Number(amt).toLocaleString("en-US") : ""} onChange={(e) => setAmt(e.target.value.replace(/\D/g, "").slice(0, 12))} onKeyDown={(e) => e.key === "Enter" && add()} />
          <div className={`flex shrink-0 rounded-xl p-1 ${soft}`}>
            {["thu", "chi"].map((t) => (
              <button key={t} onClick={() => setType(t)} className={`rounded-lg px-3.5 text-sm font-medium ${press} ${type === t ? (t === "thu" ? "bg-green-500 text-white" : "bg-red-500 text-white") : "text-neutral-500"}`}>{t === "thu" ? "Thu" : "Chi"}</button>
            ))}
          </div>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${press}`}
              style={cat === c.id ? { background: c.color + "26", borderColor: c.color, color: c.color } : { borderColor: "transparent", background: "rgba(142,142,147,.14)" }}>
              <i className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}
            </button>
          ))}
          <button onClick={() => setAdding(!adding)} className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm text-blue-500 ${soft} ${press}`}><Plus size={14} />Mới</button>
        </div>
        <AnimatePresence initial={false}>
          {adding && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
              <div className={`space-y-2.5 rounded-xl p-3 ${soft}`}>
                <input className="w-full rounded-lg bg-white/80 px-3 py-2 outline-none dark:bg-white/10" placeholder="Tên phân loại, vd: Làm thêm" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCat()} />
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)} aria-label={c} className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${press}`} style={{ background: c }}>{color === c && <Check size={14} strokeWidth={3} />}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={createCat} className={`flex-1 rounded-lg bg-blue-500 py-2 text-sm font-medium text-white ${press}`}>Tạo phân loại</button>
                  <button onClick={() => setAdding(false)} className={`rounded-lg px-4 py-2 text-sm text-neutral-500 ${press}`}>Hủy</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-2">
          <input className={inp} placeholder="Ghi chú ngắn" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button onClick={add} className={`h-11 shrink-0 rounded-xl bg-blue-500 px-4 text-sm font-medium text-white ${press}`}>Thêm</button>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.length === 0 && <li className="py-3 text-center text-sm text-neutral-500">Chưa có khoản thu chi nào</li>}
        <AnimatePresence initial={false}>
          {items.map((i) => {
            const c = catOf(i.cat);
            return (
              <motion.li key={i.id} {...rowAnim} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${soft}`}>
                <div className="min-w-0 flex-1">
                  <div className="break-words text-[15px]">{i.note || (i.type === "thu" ? "Khoản thu" : "Khoản chi")}</div>
                  <span className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: c.color + "26", color: c.color }}>{c.name}</span>
                </div>
                <span className={`shrink-0 text-[15px] font-semibold ${i.type === "thu" ? "text-green-600" : "text-red-500"}`}>{(i.type === "thu" ? "+" : "−") + fmt(i.amount)}</span>
                <button onClick={() => onDel(i.id)} aria-label="Xóa" className={`p-1.5 text-neutral-500 ${press}`}><Trash2 size={16} /></button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ---------------- Khoảnh khắc (ảnh) ---------------- */
function useBlobUrl(p, userId) {
  const [u, setU] = useState(null);
  useEffect(() => {
    let url, alive = true;
    (async () => {
      let b = await idbGet(p.id);
      if (!b && p.remote && sb) {
        try { const { data } = await sb.storage.from("moments").download(`${userId}/${p.id}.jpg`); if (data) { b = data; idbSet(p.id, b); } } catch {}
      }
      if (b && alive) { url = URL.createObjectURL(b); setU(url); }
    })();
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [p.id]);
  return u;
}

function Thumb({ p, userId, onClick }) {
  const u = useBlobUrl(p, userId);
  return (
    <button onClick={onClick} className={`aspect-square overflow-hidden rounded-xl bg-black/10 dark:bg-white/10 ${press}`}>
      {u && <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={u} alt={p.caption || "Ảnh"} className="h-full w-full object-cover" />}
    </button>
  );
}
function LbImg({ p, userId }) {
  const u = useBlobUrl(p, userId);
  return u ? <motion.img key={p.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }} src={u} alt={p.caption || "Ảnh"} className="max-h-full max-w-full rounded-lg object-contain" /> : null;
}

export function Moments({ photos, userId, onAdd, onDel }) {
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(null);
  const cur = idx != null ? photos[idx] : null;
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try { await onAdd(f, cap.trim()); setCap(""); } catch { alert("Không xử lý được ảnh này, hãy thử ảnh khác."); }
    setBusy(false);
  };
  const btn = `flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium ${press}`;
  const go = (d) => setIdx((i) => (i + d + photos.length) % photos.length);
  const t = cur ? new Date(cur.ts) : null;
  return (
    <div>
      <input className={inp} placeholder="Caption ngắn: đang làm gì?" value={cap} onChange={(e) => setCap(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <label className={`${btn} bg-blue-500 text-white ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <Camera size={17} />{busy ? "Đang nén…" : "Chụp ảnh"}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
        </label>
        <label className={`${btn} ${soft} ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <ImagePlus size={17} />Tải ảnh lên
          <input type="file" accept="image/*" className="hidden" onChange={pick} />
        </label>
      </div>
      {photos.length === 0 ? <p className="py-4 text-center text-sm text-neutral-500">Chưa có khoảnh khắc nào</p> : (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {photos.map((p, i) => <Thumb key={p.id} p={p} userId={userId} onClick={() => setIdx(i)} />)}
        </div>
      )}
      <AnimatePresence>
        {cur && (
          <motion.div key="lb" className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 text-white" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} onClick={() => setIdx(null)}>
            <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <span className="text-sm text-white/70">{pad(t.getHours())}:{pad(t.getMinutes())} · {idx + 1}/{photos.length}</span>
              <div className="flex gap-2">
                <button aria-label="Xóa ảnh" onClick={() => { if (confirm("Xóa ảnh này?")) { onDel(cur); setIdx(null); } }} className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-red-400 ${press}`}><Trash2 size={18} /></button>
                <button aria-label="Đóng" onClick={() => setIdx(null)} className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ${press}`}><X size={18} /></button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center py-3" onClick={(e) => e.stopPropagation()}>
              <LbImg p={cur} userId={userId} />
              {photos.length > 1 && <>
                <button aria-label="Ảnh trước" onClick={() => go(-1)} className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ${press}`}><ChevronLeft size={20} /></button>
                <button aria-label="Ảnh sau" onClick={() => go(1)} className={`absolute right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ${press}`}><ChevronRight size={20} /></button>
              </>}
            </div>
            <p className="text-center text-[15px]" onClick={(e) => e.stopPropagation()}>{cur.caption || <span className="text-white/40">Không có caption</span>}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
