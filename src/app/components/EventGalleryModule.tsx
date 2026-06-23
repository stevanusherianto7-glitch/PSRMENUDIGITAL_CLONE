import { Camera, Edit2, Trash2, Plus } from "lucide-react";

export function EventGalleryModule() {
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
        <button className="flex items-center justify-center gap-2 bg-[#E87722] hover:bg-[#c96317] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-all active:scale-95">
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
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors text-xs font-semibold">
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
    </div>
  );
}
