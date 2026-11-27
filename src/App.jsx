import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, LogOut, Cloud, CloudOff, RefreshCw, CalendarDays, BarChart3 } from "lucide-react";
import { sb, EASE, key, dkey, pad, uid, emptyDay, loadLocal, compress, idbSet, idbDel, DEFAULT_CATS, ui, P, tasksOf } from "./lib";
import Auth from "./Auth.jsx";
import Stats from "./Stats.jsx";
import { useTheme, ThemeLayer, ThemePicker } from "./Theme.jsx";
import { Tasks, Money, Moments } from "./Panels.jsx";

const { card, press, soft } = ui;
const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WDF = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const slide = { enter: (d) => ({ x: d * 36, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d) => ({ x: d * -36, opacity: 0 }) };
const day = (s, k) => ({ ...emptyDay(), ...(s.days[k] || {}) });
const STATUS = { ok: ["Đã đồng bộ", Cloud], sync: ["Đang đồng bộ…", RefreshCw], err: ["Lỗi mạng · sẽ thử lại", CloudOff], off: ["Offline · Demo", CloudOff] };

function Main({ user, th, onLogout, onLogin }) {
  const now = new Date(), TK = dkey(now);
  const remote = !!sb && user.id !== "demo";
  const SK = "lvtc-v2:" + user.id;
  const [st, setSt] = useState(() => loadLocal(SK, !remote));
  const [sync, setSync] = useState(remote ? "sync" : "off");
  const [tab, setTab] = useState("cal");
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dir, setDir] = useState(1);
  const [sel, setSel] = useState(null);
  const dirty = useRef(false), ref = useRef(st);
  ref.current = st;

  const upd = (fn) => setSt((s) => { dirty.current = true; return { ...fn(s), updated: Date.now() }; });
  const patch = (k, fn) => upd((s) => ({ ...s, days: { ...s.days, [k]: fn(day(s, k)) } }));
  const cats = st.cats?.length ? st.cats : DEFAULT_CATS;

  // Lưu cục bộ + đẩy lên Supabase (debounce)
  useEffect(() => {
    try { localStorage.setItem(SK, JSON.stringify(st)); } catch {}
    if (!remote || !dirty.current) return;
    const t = setTimeout(async () => {
      setSync("sync");
      const { error } = await sb.from("user_data").upsert({ user_id: user.id, data: ref.current, updated_at: new Date().toISOString() });
      if (!error && ref.current === st) dirty.current = false;
      setSync(error ? "err" : "ok");
    }, 900);
    return () => clearTimeout(t);
  }, [st]);

  // Kéo dữ liệu mới nhất (last-write-wins theo trường `updated`)
  const pull = async () => {
    if (!remote) return;
    if (dirty.current) { setSt((s) => ({ ...s })); return; }
    setSync("sync");
    const { data, error } = await sb.from("user_data").select("data").eq("user_id", user.id).maybeSingle();
    if (error) return setSync("err");
    const r = data?.data, rem = r?.updated || 0, loc = ref.current.updated || 0;
    if (r && rem > loc) { setSt({ ...r }); setSync("ok"); }
    else if (loc > rem) { dirty.current = true; setSt((s) => ({ ...s })); }
    else setSync("ok");
  };
  useEffect(() => {
    pull();
    const f = () => document.visibilityState === "visible" && pull();
    document.addEventListener("visibilitychange", f); window.addEventListener("online", f);
    return () => { document.removeEventListener("visibilitychange", f); window.removeEventListener("online", f); };
  }, []);

  const act = sel || TK, cur = day(st, act), tasks = tasksOf(st, act);
  const api = {
    addT: (text, rep) => rep
      ? upd((s) => ({ ...s, recur: [...(s.recur || []), { id: uid(), text, dow: P(act).getDay(), start: act, until: null, skip: [], done: {} }] }))
      : patch(act, (d) => ({ ...d, tasks: [...d.tasks, { id: uid(), text, done: false }] })),
    togT: (t) => t.recur
      ? upd((s) => ({ ...s, recur: s.recur.map((r) => (r.id === t.id ? { ...r, done: { ...r.done, [act]: !r.done[act] } } : r)) }))
      : patch(act, (d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })),
    delT: (t, scope) => t.recur
      ? upd((s) => ({ ...s, recur: (s.recur || []).flatMap((r) => {
          if (r.id !== t.id) return [r];
          if (scope === "today") return [{ ...r, skip: [...(r.skip || []), act] }];
          return act <= r.start ? [] : [{ ...r, until: act }];
        }) }))
      : patch(act, (d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) })),
    moveT: (ids) => upd((s) => {
      const from = day(s, act), to = day(s, TK), mv = from.tasks.filter((t) => ids.includes(t.id));
      return { ...s, days: { ...s.days, [act]: { ...from, tasks: from.tasks.filter((t) => !ids.includes(t.id)) }, [TK]: { ...to, tasks: [...to.tasks, ...mv] } } };
    }),
    addM: (m) => patch(act, (d) => ({ ...d, money: [...d.money, { id: uid(), ...m }] })),
    delM: (id) => patch(act, (d) => ({ ...d, money: d.money.filter((t) => t.id !== id) })),
    addCat: (c) => upd((s) => ({ ...s, cats: [...(s.cats?.length ? s.cats : DEFAULT_CATS), c] })),
    addP: async (file, caption) => {
      const date = act, blob = await compress(file), id = uid();
      await idbSet(id, blob);
      let rm = false;
      if (remote) { try { const { error } = await sb.storage.from("moments").upload(`${user.id}/${id}.jpg`, blob, { contentType: "image/jpeg" }); rm = !error; } catch {} }
      patch(date, (d) => ({ ...d, photos: [...d.photos, { id, caption, ts: Date.now(), remote: rm }] }));
    },
    delP: async (p) => {
      idbDel(p.id);
      if (remote && p.remote) { try { await sb.storage.from("moments").remove([`${user.id}/${p.id}.jpg`]); } catch {} }
      patch(act, (d) => ({ ...d, photos: d.photos.filter((x) => x.id !== p.id) }));
    },
  };

  const cells = useMemo(() => {
    const first = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;
    const n = new Date(ym.y, ym.m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  }, [ym]);
  const go = (d) => { setDir(d); setYm(({ y, m }) => { const t = new Date(y, m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; }); };
  const goToday = () => {
    const cmp = (now.getFullYear() - ym.y) * 12 + now.getMonth() - ym.m;
    if (cmp) { setDir(cmp > 0 ? 1 : -1); setYm({ y: now.getFullYear(), m: now.getMonth() }); }
    setSel(null);
  };
  const [ay, am, ad] = act.split("-").map(Number), actDate = new Date(ay, am - 1, ad);
  const [sLabel, SIcon] = STATUS[sync];
  const notToday = act !== TK;

  return (
    <div>
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex rounded-xl bg-black/[0.06] p-1 backdrop-blur dark:bg-white/10">
            {[["cal", "Lịch", CalendarDays], ["stats", "Thống kê", BarChart3]].map(([k, l, I]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium ${press} ${tab === k ? "bg-white shadow-sm dark:bg-white/20" : "text-neutral-500"}`}><I size={15} />{l}</button>
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span title={sLabel} className="flex items-center gap-1.5 truncate rounded-full bg-white px-3 py-1.5 text-xs text-neutral-500 dark:bg-neutral-900">
              <SIcon size={13} className={sync === "sync" ? "animate-spin text-blue-500" : sync === "ok" ? "text-green-500" : ""} /><span className="hidden sm:inline">{sLabel}</span>
            </span>
            <ThemePicker th={th} />
            {remote ? (
              <button onClick={onLogout} aria-label="Đăng xuất" title={user.email} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 backdrop-blur dark:bg-white/10 ${press}`}><LogOut size={15} /></button>
            ) : sb && <button onClick={onLogin} className={`shrink-0 rounded-full bg-blue-500 px-3 py-1.5 text-xs font-medium text-white ${press}`}>Đăng nhập</button>}
          </div>
        </header>

        {tab === "stats" ? <Stats days={st.days} cats={cats} today={TK} /> : (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-6">
            <section className={`${card} sm:p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Tháng {ym.m + 1}, {ym.y}</h1>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => go(-1)} aria-label="Tháng trước" className={`flex h-9 w-9 items-center justify-center rounded-full ${soft} ${press}`}><ChevronLeft size={18} /></button>
                  <button onClick={goToday} className={`h-9 rounded-full px-3.5 text-sm font-medium text-blue-500 ${soft} ${press}`}>Hôm nay</button>
                  <button onClick={() => go(1)} aria-label="Tháng sau" className={`flex h-9 w-9 items-center justify-center rounded-full ${soft} ${press}`}><ChevronRight size={18} /></button>
                </div>
              </div>
              <div className="mb-1 grid grid-cols-7">
                {WD.map((w, i) => <div key={w} className={`py-1.5 text-center text-xs font-medium ${i === 6 ? "text-red-500" : "text-neutral-500"}`}>{w}</div>)}
              </div>
              <div className="overflow-hidden">
                <AnimatePresence mode="wait" initial={false} custom={dir}>
                  <motion.div key={`${ym.y}-${ym.m}`} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: EASE }} className="grid min-h-[336px] grid-cols-7 content-start gap-y-1">
                    {cells.map((d, i) => {
                      if (!d) return <div key={`b${i}`} />;
                      const k = key(ym.y, ym.m, d), v = st.days[k], isT = k === TK, isS = k === sel;
                      return (
                        <button key={k} onClick={() => setSel(isS ? null : k)} className={`flex flex-col items-center py-1 sm:py-1.5 ${press}`}>
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] transition-colors duration-300 sm:h-10 sm:w-10 ${isS ? "bg-blue-500 font-semibold text-white" : isT ? "font-semibold text-blue-500 ring-2 ring-blue-500" : ""}`}>{d}</span>
                          <span className="mt-1 flex h-1.5 gap-1">
                            {tasksOf(st, k).length > 0 && <i className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                            {v?.money?.length > 0 && <i className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                            {v?.photos?.length > 0 && <i className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-blue-500" />Việc</span>
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-orange-500" />Thu chi</span>
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-purple-500" />Ảnh</span>
              </div>
            </section>

            <div className="mt-4 lg:mt-0">
              <AnimatePresence mode="wait" initial={false}>
                {sel ? (
                  <motion.div key={sel} className="space-y-4" {...ui.enter()}>
                    <div className="flex items-center justify-between px-1">
                      <div><div className="text-lg font-semibold">{WDF[actDate.getDay()]}</div><div className="text-sm text-neutral-500">{pad(ad)}/{pad(am)}/{ay}</div></div>
                      <button onClick={() => setSel(null)} aria-label="Đóng" className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/70 backdrop-blur dark:bg-white/10 ${press}`}><X size={18} /></button>
                    </div>
                    <motion.section className={card} {...ui.enter(0.05)}>
                      <h2 className="mb-3 font-semibold">Đầu việc trong ngày</h2>
                      <Tasks items={tasks} dowLabel={WDF[P(act).getDay()]} onAdd={api.addT} onToggle={api.togT} onDel={api.delT}
                        onMove={notToday ? (t) => api.moveT([t.id]) : undefined}
                        onMoveAll={act < TK ? () => api.moveT(cur.tasks.filter((t) => !t.done).map((t) => t.id)) : undefined} />
                    </motion.section>
                    <motion.section className={card} {...ui.enter(0.12)}>
                      <h2 className="mb-3 font-semibold">Thu & Chi trong ngày</h2>
                      <Money items={cur.money} cats={cats} onAdd={api.addM} onDel={api.delM} onAddCat={api.addCat} />
                    </motion.section>
                    <motion.section className={card} {...ui.enter(0.19)}>
                      <h2 className="mb-3 font-semibold">Khoảnh khắc trong ngày</h2>
                      <Moments photos={cur.photos} userId={user.id} onAdd={api.addP} onDel={api.delP} />
                    </motion.section>
                  </motion.div>
                ) : (
                  <motion.section key="today" className={card} {...ui.enter()}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h2 className="font-semibold">Đầu việc hôm nay</h2>
                      <span className="text-sm text-neutral-500">{pad(now.getDate())}/{pad(now.getMonth() + 1)}</span>
                    </div>
                    <Tasks items={tasks} dowLabel={WDF[P(act).getDay()]} onAdd={api.addT} onToggle={api.togT} onDel={api.delT} />
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const th = useTheme();
  const [sess, setSess] = useState(sb ? undefined : null);
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSess(data.session));
    const { data } = sb.auth.onAuthStateChange((_, s) => setSess(s));
    return () => data.subscription.unsubscribe();
  }, []);
  let body;
  if (sess === undefined) body = <div className="flex min-h-screen items-center justify-center text-neutral-500">Đang tải…</div>;
  else if (sb && !sess && !skip) body = <Auth onSkip={() => setSkip(true)} />;
  else {
    const user = sess ? { id: sess.user.id, email: sess.user.email } : { id: "demo", email: null };
    body = <Main key={user.id} user={user} th={th} onLogin={() => setSkip(false)} onLogout={async () => { await sb.auth.signOut(); setSkip(false); }} />;
  }
  return (
    <div className="relative isolate min-h-screen text-neutral-900 dark:text-neutral-100">
      <ThemeLayer th={th} />
      {body}
    </div>
  );
}
