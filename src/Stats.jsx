import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { dkey, P, fmt, ui, EASE } from "./lib";

const addD = (s, n) => { const d = P(s); d.setDate(d.getDate() + n); return dkey(d); };
const collect = (days, a, b) => { const r = []; for (const k in days) if (k >= a && k <= b) r.push(...(days[k].money || [])); return r; };
const sum = (l, t) => l.filter((i) => i.type === t).reduce((s, i) => s + i.amount, 0);

function Tr({ label, cur, prev, goodDown }) {
  const d = cur - prev, pct = prev ? (d / prev) * 100 : null;
  const good = goodDown ? d < 0 : d > 0;
  const Arrow = d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-neutral-500">{label}</span>
      {d === 0 ? <span className="text-neutral-500">Không đổi</span> : (
        <span className={`flex items-center gap-0.5 font-medium ${good ? "text-green-600" : "text-red-500"}`}>
          <Arrow size={14} />{fmt(Math.abs(d))}{pct != null && ` (${d > 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%)`}
        </span>
      )}
    </div>
  );
}

export default function Stats({ days, cats, today }) {
  const [mode, setMode] = useState("month");
  const [day, setDay] = useState(today);
  const [mon, setMon] = useState(today.slice(0, 7));
  const [from, setFrom] = useState(addD(today, -6));
  const [to, setTo] = useState(today);
  const [bt, setBt] = useState("chi");

  const r = useMemo(() => {
    if (mode === "day") return { a: day, b: day, pa: addD(day, -1), pb: addD(day, -1), pl: "hôm trước" };
    if (mode === "month") {
      const [y, m] = mon.split("-").map(Number);
      return { a: `${mon}-01`, b: dkey(new Date(y, m, 0)), pa: dkey(new Date(y, m - 2, 1)), pb: dkey(new Date(y, m - 1, 0)), pl: "tháng trước" };
    }
    const [x, y] = from <= to ? [from, to] : [to, from];
    const n = Math.round((P(y) - P(x)) / 864e5) + 1;
    return { a: x, b: y, pa: addD(x, -n), pb: addD(x, -1), pl: "kỳ trước" };
  }, [mode, day, mon, from, to]);

  const cur = useMemo(() => collect(days, r.a, r.b), [days, r]);
  const prev = useMemo(() => collect(days, r.pa, r.pb), [days, r]);
  const thu = sum(cur, "thu"), chi = sum(cur, "chi"), left = thu - chi;

  const rows = useMemo(() => {
    const items = cur.filter((i) => i.type === bt), total = items.reduce((s, i) => s + i.amount, 0), g = {};
    items.forEach((i) => { g[i.cat || "khac"] = (g[i.cat || "khac"] || 0) + i.amount; });
    return Object.entries(g).map(([id, v]) => ({ ...(cats.find((c) => c.id === id) || { name: "Khác", color: "#8e8e93" }), v, pct: total ? (v / total) * 100 : 0 })).sort((a, b) => b.v - a.v);
  }, [cur, bt, cats]);

  const seg = (v, set, opts) => (
    <div className={`flex rounded-xl p-1 ${ui.soft}`}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => set(k)} className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${ui.press} ${v === k ? "bg-white shadow-sm dark:bg-white/20" : "text-neutral-500"}`}>{l}</button>
      ))}
    </div>
  );
  const dIn = (v, set, type = "date") => <input type={type} className={ui.inp} value={v} onChange={(e) => e.target.value && set(e.target.value)} />;

  return (
    <motion.div {...ui.enter()} className="mx-auto max-w-2xl space-y-4">
      <section className={`${ui.card} space-y-3`}>
        {seg(mode, setMode, [["day", "Theo ngày"], ["month", "Theo tháng"], ["range", "Tùy chọn"]])}
        {mode === "day" && dIn(day, setDay)}
        {mode === "month" && dIn(mon, setMon, "month")}
        {mode === "range" && <div className="grid grid-cols-2 gap-2">{dIn(from, setFrom)}{dIn(to, setTo)}</div>}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className={ui.card}><div className="text-xs text-neutral-500">Tổng thu</div><div className="mt-1 text-xl font-semibold text-green-600">{fmt(thu)}</div></div>
        <div className={ui.card}><div className="text-xs text-neutral-500">Tổng chi</div><div className="mt-1 text-xl font-semibold text-red-500">{fmt(chi)}</div></div>
        <div className={ui.card}><div className="text-xs text-neutral-500">Số còn lại</div><div className={`mt-1 text-xl font-semibold ${left < 0 ? "text-red-500" : "text-blue-500"}`}>{left < 0 ? "−" : ""}{fmt(Math.abs(left))}</div></div>
        <div className={`${ui.card} space-y-1.5`}>
          <div className="text-xs text-neutral-500">So với {r.pl}</div>
          <Tr label="Chi" cur={chi} prev={sum(prev, "chi")} goodDown />
          <Tr label="Thu" cur={thu} prev={sum(prev, "thu")} />
        </div>
      </div>

      <section className={`${ui.card} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Phân loại</h2>
          <div className="w-32">{seg(bt, setBt, [["chi", "Chi"], ["thu", "Thu"]])}</div>
        </div>
        {rows.length === 0 && <p className="py-4 text-center text-sm text-neutral-500">Chưa có dữ liệu trong khoảng này</p>}
        {rows.map((c) => (
          <div key={c.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
              <span><b>{fmt(c.v)}</b> <span className="text-neutral-500">· {c.pct.toFixed(1)}%</span></span>
            </div>
            <div className={`h-2 overflow-hidden rounded-full ${ui.soft}`}>
              <motion.div className="h-full rounded-full" style={{ background: c.color }} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.6, ease: EASE }} />
            </div>
          </div>
        ))}
      </section>
    </motion.div>
  );
}
