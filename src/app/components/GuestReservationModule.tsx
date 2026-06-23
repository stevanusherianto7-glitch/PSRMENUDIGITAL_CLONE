import { Calendar, User, Phone, Users, Clock, FileText, Sparkles } from "lucide-react";

export function GuestReservationModule() {
  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground tracking-wide uppercase">
          <Calendar className="text-[#E87722]" size={16} /> RESERVASI TEMPAT & ACARA
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Booking tempat untuk makan keluarga, pertemuan bisnis, ulang tahun, hingga pesta pernikahan di Kedai Elvera 57.
        </p>
      </div>

      <form className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Reservasi berhasil diajukan!"); }}>
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <User className="text-[#E87722]" size={12} /> NAMA LENGKAP PEMESAN <span className="text-red-500">*</span>
          </label>
          <input type="text" required placeholder="Masukkan nama lengkap Anda" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#E87722] transition-colors" />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <Phone className="text-[#E87722]" size={12} /> NOMOR TELEPON / WHATSAPP <span className="text-red-500">*</span>
          </label>
          <input type="tel" required placeholder="Contoh: 081234567890" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#E87722] transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="text-[#E87722]" size={12} /> JENIS RESERVASI
            </label>
            <select className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm text-foreground appearance-none focus:outline-none focus:border-[#E87722] transition-colors">
              <option>Meja Makan Biasa</option>
              <option>Meeting / Corporate</option>
              <option>Ulang Tahun</option>
              <option>Pernikahan</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Users className="text-[#E87722]" size={12} /> JUMLAH TAMU <span className="text-red-500">*</span>
            </label>
            <input type="number" min="1" required defaultValue={2} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#E87722] transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Calendar className="text-[#E87722]" size={12} /> TANGGAL BOOKING <span className="text-red-500">*</span>
            </label>
            <input type="date" required className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none focus:border-[#E87722] transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Clock className="text-[#E87722]" size={12} /> JAM MULAI <span className="text-red-500">*</span>
            </label>
            <input type="time" required className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none focus:border-[#E87722] transition-colors" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <FileText className="text-[#E87722]" size={12} /> CATATAN KHUSUS / PERMINTAAN (OPSIONAL)
          </label>
          <textarea rows={3} placeholder="Contoh: Butuh meja di dekat area musik live, request menu diet gluten-free, dll." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#E87722] transition-colors resize-none"></textarea>
        </div>

        <button type="submit" className="w-full py-3.5 mt-2 bg-[#E87722] hover:bg-[#c96317] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
          <Calendar size={16} /> AJUKAN RESERVASI SEKARANG
        </button>
      </form>
    </div>
  );
}
