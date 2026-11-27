import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { sb, ui, explainAuthError, SB_KEY_ERROR } from "./lib";

export default function Auth({ onSkip }) {
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    if (!email.trim() || pw.length < 6) return setMsg({ e: 1, t: "Nhập email và mật khẩu (tối thiểu 6 ký tự)" });
    if (SB_KEY_ERROR) return setMsg({ e: 1, t: SB_KEY_ERROR });
    setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
      } else {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setMsg({ t: "Đã gửi email xác nhận. Hãy mở email rồi quay lại đăng nhập." });
      }
    } catch (e) {
      setMsg({ e: 1, t: explainAuthError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div {...ui.enter()} className={`${ui.card} w-full max-w-sm space-y-4 p-6`}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white"><CalendarDays size={28} /></div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Lịch việc & thu chi</h1>
          <p className="mt-1 text-sm text-neutral-500">{mode === "in" ? "Đăng nhập để đồng bộ giữa các thiết bị" : "Tạo tài khoản mới"}</p>
        </div>
        <input className={ui.inp} type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={ui.inp} type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {msg && <p className={`text-sm ${msg.e ? "text-red-500" : "text-green-600"}`}>{msg.t}</p>}
        <button onClick={submit} disabled={busy} className={`h-11 w-full rounded-xl bg-blue-500 font-medium text-white disabled:opacity-60 ${ui.press}`}>
          {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Đăng ký"}
        </button>
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="w-full text-sm text-blue-500">
          {mode === "in" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
        <button onClick={onSkip} className="w-full border-t border-neutral-200 pt-3 text-sm text-neutral-500 dark:border-neutral-800">Dùng thử Offline (không đồng bộ)</button>
      </motion.div>
    </div>
  );
}
