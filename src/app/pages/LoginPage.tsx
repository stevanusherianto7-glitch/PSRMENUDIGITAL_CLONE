/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI HALAMAN LOGIN DAN ROUTING AUTENTIKASI ROLE (ADMIN/WAITER/KITCHEN).
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN USER TIDAK BISA MASUK ATAU REDIRECT SALAH. ⚠️
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Menggunakan react-router-dom agar tidak error context
import { ChefHat, Eye, EyeOff, Lock, ArrowRight, UtensilsCrossed, ShoppingBag, Scan } from "lucide-react";
import { supabase } from "../../lib/supabase";

// Menggunakan string path untuk logo agar tidak error di Vite
import { CREDENTIALS, BRAND_NAME, APP_LOGO as logoImg } from "../data";
import type { UserRole, UserSession } from "../types";

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("admin");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roles: { id: UserRole; label: string; desc: string; icon: typeof ChefHat }[] = [
    { id: "admin",   label: "Admin",  desc: "Dashboard, laporan, menu, QR meja",   icon: ChefHat },
    { id: "waiter",  label: "Waiter", desc: "Terima & antar pesanan ke meja",      icon: UtensilsCrossed },
    { id: "kitchen", label: "Dapur",  desc: "Proses & masak pesanan masuk",        icon: ShoppingBag },
  ];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));

    const defaultCred = CREDENTIALS[role as keyof typeof CREDENTIALS];
    const email = `${role}@pawonsalam.id`;
    let userSessionName = defaultCred ? defaultCred.name : `${role} Staff`;

    try {
      // 1. Coba login dengan Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Jika login gagal, periksa apakah karena user belum terdaftar
        // Dan apakah password yang diinput adalah password default untuk peran tersebut
        if (defaultCred && password === defaultCred.password && (authError.message.includes("Invalid login credentials") || authError.message.includes("Email not confirmed"))) {
          // Lakukan auto-seed (registrasi otomatis)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                nama: defaultCred.name,
                role: role
              }
            }
          });

          if (signUpError) {
            throw signUpError;
          }

          // Coba login kembali setelah registrasi otomatis berhasil
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryError) {
            throw retryError;
          }

          if (retryData.user?.user_metadata?.nama) {
            userSessionName = retryData.user.user_metadata.nama;
          }
        } else {
          // Jika gagal karena password salah (bukan default) atau error lain, lemparkan error asli
          throw authError;
        }
      } else {
        if (authData.user?.user_metadata?.nama) {
          userSessionName = authData.user.user_metadata.nama;
        }
      }

      // Buat session local untuk kecocokan frontend yang ada
      const session: UserSession = { role, name: userSessionName };
      localStorage.setItem("pawon_session", JSON.stringify(session));

      // Pengalihan halaman berdasarkan peran
      if (role === "admin" || role === "manager" || role === "owner") navigate("/admin");
      else if (role === "kitchen") navigate("/kitchen");
      else navigate("/waiter");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Gagal masuk. Periksa kembali kredensial Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex batik-pattern">
      {/* Left — Branding (heritage hero) */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] bg-sidebar text-sidebar-foreground p-12 relative overflow-hidden">
        {/* Ornament */}
        <div className="absolute inset-0 batik-pattern-dark opacity-60 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="relative flex items-center gap-3">
          <img src={logoImg} alt={BRAND_NAME} className="w-11 h-11 rounded-xl object-cover ring-1 ring-gold/40" />
          <div>
            <p className="font-display text-lg leading-none text-sidebar-foreground">{BRAND_NAME}</p>
            <p className="eyebrow mt-1">Restaurant System</p>
          </div>
        </div>

        <div className="relative space-y-10">
          <div>
            <p className="eyebrow mb-4">Sejak 2025 · Semarang</p>
            <h1 className="font-display text-5xl leading-[1.05] text-sidebar-foreground">
              Cita rasa Jawa,
              <br />
              <span className="text-gold italic">disajikan modern.</span>
            </h1>
            <div className="gold-rule-short mt-6" />
            <p className="text-sidebar-foreground/70 text-sm mt-5 leading-relaxed max-w-sm">
              Platform manajemen restoran terintegrasi — dari pemesanan tamu melalui QR, dapur, hingga laporan penjualan.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: Scan, label: "QR Self-Order", desc: "Tamu pesan langsung dari meja" },
              { icon: ChefHat, label: "Dapur Realtime", desc: "Antrian pesanan otomatis masuk" },
              { icon: UtensilsCrossed, label: "Monitor Pesanan", desc: "Pantau semua transaksi live" },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-gold/40 bg-gold/5 flex items-center justify-center flex-shrink-0">
                  <f.icon size={16} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-sidebar-foreground">{f.label}</p>
                  <p className="text-xs text-sidebar-foreground/60 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] tracking-widest uppercase text-sidebar-foreground/40">© 2025 {BRAND_NAME}</p>
      </div>

      {/* Right — Login Form */}
      <div 
        className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden"
        style={{ 
          backgroundImage: "url('/login-bg.png')", 
          backgroundSize: "cover", 
          backgroundPosition: "center" 
        }}
      >
        {/* Elegant overlay to integrate the photo professionally */}
        <div className="absolute inset-0 bg-[#120D0A]/30" />

        <div className="w-full max-w-md bg-white/20 dark:bg-black/35 relative p-8 lg:p-10 rounded-2xl border border-white/10 dark:border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-700 antialiased transform-gpu">
          {/* Glassmorphic backdrop blur layer isolated from text with matching rounded corners */}
          <div className="absolute inset-0 backdrop-blur-2xl rounded-2xl z-[-1] pointer-events-none" />
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <img src={logoImg} alt={BRAND_NAME} className="w-12 h-12 rounded-xl object-cover ring-1 ring-gold/40" />
            <div>
              <p className="font-display text-xl leading-none">{BRAND_NAME}</p>
              <p className="eyebrow mt-1">Restaurant System</p>
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <p className="eyebrow mb-3 font-black tracking-widest">Masuk</p>
            <h2 className="font-display text-4xl leading-tight text-white font-black">Selamat datang kembali</h2>
            <div className="gold-rule-short mt-4 lg:mx-0 mx-auto" />
            <p className="text-gold text-sm mt-4 font-normal antialiased">Pilih peran lalu masukkan password.</p>
          </div>

          {/* Role selection */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {roles.map(r => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setRole(r.id); setError(""); setPassword(""); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-md ${
                    active
                      ? "bg-primary border-primary text-white font-black shadow-[0_4px_20px_rgba(181,70,42,0.4)]"
                      : "bg-white/50 dark:bg-black/45 border-slate-300 dark:border-white/15 hover:bg-white/60 dark:hover:bg-white/10 hover:border-slate-400 text-slate-955 dark:text-white font-extrabold"
                  }`}
                >
                  <Icon size={22} className={active ? "text-white" : "text-slate-800 dark:text-slate-200"} />
                  <p className="text-[11px] font-bold tracking-wide uppercase">{r.label}</p>
                </button>
              );
            })}
          </div>

          <div className="mb-6 px-4 py-3 rounded-lg bg-white/45 dark:bg-black/45 border border-slate-300 dark:border-white/15 text-xs text-slate-950 dark:text-white font-extrabold italic">
            {roles.find(r => r.id === role)?.desc}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-slate-955 dark:text-white font-black text-xs uppercase tracking-wider drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-850 dark:text-slate-200 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder={`Password ${roles.find(r => r.id === role)?.label}`}
                  className="w-full bg-white/90 dark:bg-black/60 border border-slate-450 dark:border-white/20 rounded-lg pl-10 pr-11 py-3.5 text-[15px] focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/20 transition-all text-slate-955 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 font-extrabold shadow-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-850 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/8 border border-destructive/25 rounded-lg px-4 py-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password || loading}
              className="btn-heritage w-full py-3.5 rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 tracking-wide"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-foreground/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Masuk <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-350 dark:border-white/10 text-center">
            <p className="eyebrow mb-3 font-black uppercase tracking-wider">Untuk Tamu</p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-900 dark:text-slate-100 font-bold drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <Scan size={12} className="text-gold" />
              <span>Scan QR di meja untuk memesan langsung</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
