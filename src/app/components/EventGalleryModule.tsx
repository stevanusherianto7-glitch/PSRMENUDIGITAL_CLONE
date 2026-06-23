import { useState } from "react";
import { Camera, Edit2, Trash2, Plus, X, Sparkles, Image as ImageIcon, Link, Upload } from "lucide-react";

export function EventGalleryModule() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const events = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      badge: "WEDDING",
      title: "Jamuan Pernikahan...",
      date: "12 MEI 2026",
      description: "Merayakan hari bahagia bersama keluarga tercinta dengan konsep prasmanan premium dan dekorasi ada..."
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      badge: "CORPORATE",
      title: "Gathering & Rapat...",
      date: "28 APRIL 2026",
      description: "Jamuan makan siang prasmanan premium dan kopi rehat berkualitas untuk kegiatan rapat kerja instansi dan..."
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1530103862676-de88b485fe6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      badge: "BIRTHDAY",
      title: "Ulang Tahun &...",
      date: "05 APRIL 2026",
      description: "Momen hangat kumpul keluarga besar merayakan ulang tahun dengan hidangan lezat racikan khusus koki..."
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      badge: "MUSIC EVENT",
      title: "Weekend Live...",
      date: "MARET - MEI 2026",
      description: "Keseruan akhir pekan di area taman outdoor menikmati alunan live acoustic music ditemani hidangan santai..."
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-800">Manajemen Galeri Acara Restoran</h3>
          <p className="text-muted-foreground text-sm mt-1">Kelola foto-foto dokumentasi momen berharga untuk ditampilkan di Buku Menu Tamu</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#E87722] hover:bg-[#c96317] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-all active:scale-95"
        >
          <Plus size={16} /> TAMBAH FOTO ACARA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-all">
            <div className="relative h-48 w-full overflow-hidden">
              <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full border border-white/50"></div> {event.badge}
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="font-bold text-sm text-slate-800 leading-snug line-clamp-1">{event.title}</h4>
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap pt-0.5 tracking-wider uppercase">{event.date}</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed mb-5 line-clamp-3 flex-1">
                {event.description}
              </p>
              
              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-50">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors text-xs font-semibold"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-semibold">
                  <Trash2 size={12} /> Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-[#1c1917] w-full max-w-[480px] rounded-2xl shadow-2xl border border-white/10 overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2 text-white font-bold tracking-wide">
                <Sparkles className="text-[#E87722]" size={18} /> EDIT FOTO ACARA
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              {/* Judul */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Judul Acara</label>
                <input type="text" defaultValue="Jamuan Pernikahan Premium" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors font-medium" />
              </div>
              
              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Tanggal</label>
                  <input type="text" defaultValue="12 Mei 2026" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Kategori</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-white/20 transition-colors font-medium">
                    <option value="wedding">Wedding</option>
                    <option value="corporate">Corporate</option>
                    <option value="birthday">Birthday</option>
                  </select>
                </div>
              </div>
              
              {/* Gambar Acara */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Gambar Acara</label>
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#E87722]/10 text-[#E87722] border border-[#E87722]/30">
                      <ImageIcon size={12} /> Preview
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                      <Upload size={12} /> Upload
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white/80 text-black hover:bg-white transition-colors">
                      <Link size={12} /> URL
                    </button>
                  </div>
                </div>
                
                <div className="h-[200px] border-2 border-dashed border-[#d6cbbc] rounded-2xl flex flex-col items-center justify-center bg-[#f2efe9] text-[#9a8c78] hover:bg-[#e8e4db] transition-colors cursor-pointer group">
                  <Camera size={36} className="mb-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <p className="text-xs font-medium">Belum ada foto · klik untuk upload</p>
                </div>
              </div>
              
              {/* Default Images */}
              <div className="space-y-3 pt-4">
                <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Pilih Cepat Dari Gambar Default:</label>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {events.map(e => (
                    <img key={e.id} src={e.image} alt="" className="h-[52px] w-[84px] object-cover rounded-xl border border-white/10 cursor-pointer hover:border-[#E87722] transition-colors flex-shrink-0" />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-white/5">
              <button 
                className="w-full py-3.5 bg-[#E87722] hover:bg-[#c96317] text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-95" 
                onClick={() => setIsModalOpen(false)}
              >
                SIMPAN PERUBAHAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
