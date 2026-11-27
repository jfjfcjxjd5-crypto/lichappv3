import { createClient } from "@supabase/supabase-js";

const U = import.meta.env.VITE_SUPABASE_URL;
const K = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Không có khóa => sb = null => app tự chạy Offline/Demo (localStorage + IndexedDB)
export const sb = U && K ? createClient(U, K) : null;

export const EASE = [0.22, 1, 0.36, 1];
export const pad = (n) => String(n).padStart(2, "0");
export const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const dkey = (t) => key(t.getFullYear(), t.getMonth(), t.getDate());
export const P = (s) => { const [a, b, c] = s.split("-").map(Number); return new Date(a, b - 1, c); };
export const fmt = (n) => Number(n).toLocaleString("en-US") + "đ";
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const emptyDay = () => ({ tasks: [], money: [], photos: [] });

export const COLORS = ["#ff9f0a", "#0a84ff", "#30d158", "#bf5af2", "#ff453a", "#64d2ff", "#ff375f", "#8e8e93"];
export const DEFAULT_CATS = [
  { id: "an", name: "Ăn uống", color: "#ff9f0a" },
  { id: "dc", name: "Đi lại", color: "#0a84ff" },
  { id: "hoc", name: "Học tập", color: "#bf5af2" },
  { id: "lam", name: "Làm thêm", color: "#30d158" },
  { id: "khac", name: "Khác", color: "#8e8e93" },
];

export const ui = {
  card: "rounded-[22px] border border-white/60 bg-white/70 p-4 shadow-[0_8px_30px_rgba(20,20,50,.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-[0_8px_30px_rgba(0,0,0,.35)]",
  inp: "w-full min-w-0 rounded-xl bg-black/[0.05] px-3 py-2.5 text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500/50 dark:bg-white/10 dark:text-neutral-100",
  press: "transition active:scale-[0.97]",
  soft: "bg-black/[0.05] dark:bg-white/10",
  chip: "bg-white/70 backdrop-blur dark:bg-white/10",
  active: "bg-white shadow-sm dark:bg-white/20",
  enter: (delay = 0) => ({
    initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 },
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

/* Đầu việc của một ngày = việc riêng ngày đó + việc lặp hàng tuần khớp thứ */
export const tasksOf = (s, k) => {
  const dow = P(k).getDay();
  const rec = (s.recur || [])
    .filter((r) => r.dow === dow && k >= r.start && (!r.until || k < r.until) && !(r.skip || []).includes(k))
    .map((r) => ({ id: r.id, text: r.text, done: !!(r.done || {})[k], recur: true }));
  return [...((s.days[k] || {}).tasks || []), ...rec];
};

/* ---------- Dữ liệu cục bộ ---------- */
function seed() {
  const t = new Date(), o = (n) => dkey(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
  const T = (text, done = false) => ({ id: uid(), text, done });
  const M = (amount, type, note, cat) => ({ id: uid(), amount, type, note, cat });
  return {
    [o(0)]: { tasks: [T("Nộp báo cáo nhóm"), T("19h30 chạy bộ"), T("Mua đồ ăn tối", true)], money: [M(35000, "chi", "Cà phê", "an"), M(500000, "thu", "Dạy kèm", "lam")], photos: [] },
    [o(-1)]: { tasks: [T("Ôn bài kiểm toán")], money: [M(60000, "chi", "Grab đi học", "dc")], photos: [] },
    [o(-3)]: { tasks: [], money: [M(120000, "chi", "Mua sách", "hoc"), M(2000000, "thu", "Gia đình gửi", "khac")], photos: [] },
    [o(1)]: { tasks: [T("8h họp lớp")], money: [], photos: [] },
    [o(-32)]: { tasks: [], money: [M(400000, "chi", "Ăn uống tháng trước", "an"), M(1500000, "thu", "Làm thêm", "lam")], photos: [] },
  };
}
export function loadLocal(k, demo) {
  try {
    const r = localStorage.getItem(k);
    if (r) return JSON.parse(r);
    if (demo) { // nâng cấp từ bản v1
      const v1 = localStorage.getItem("lich-viec-thu-chi-v1");
      if (v1) return { days: JSON.parse(v1), recur: [], cats: DEFAULT_CATS, updated: 0 };
    }
  } catch {}
  const d = new Date(); d.setDate(d.getDate() - 14);
  const recur = demo ? [{ id: uid(), text: "Họp nhóm (lặp hàng tuần)", dow: d.getDay(), start: dkey(d), until: null, skip: [], done: {} }] : [];
  return { days: demo ? seed() : {}, recur, cats: DEFAULT_CATS, updated: 0 };
}

/* ---------- IndexedDB lưu ảnh (blob) ---------- */
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open("lvtc-photos", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("p");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction("p", mode), rq = fn(t.objectStore("p"));
    t.oncomplete = () => res(rq && rq.result);
    t.onerror = () => rej(t.error);
  });
};
export const idbGet = (k) => tx("readonly", (s) => s.get(k)).catch(() => null);
export const idbSet = (k, v) => tx("readwrite", (s) => s.put(v, k)).catch(() => null);
export const idbDel = (k) => tx("readwrite", (s) => s.delete(k)).catch(() => null);

/* ---------- Nén ảnh bằng Canvas: rộng tối đa 1080px, chất lượng 0.75 ---------- */
export const compress = (file, max = 1080, q = 0.75) => new Promise((res, rej) => {
  const u = URL.createObjectURL(file), im = new Image();
  im.onload = () => {
    const r = Math.min(1, max / im.naturalWidth), c = document.createElement("canvas");
    c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    URL.revokeObjectURL(u);
    c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", q);
  };
  im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); };
  im.src = u;
});
