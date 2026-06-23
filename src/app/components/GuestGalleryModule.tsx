import { Sparkles } from "lucide-react";

export function GuestGalleryModule() {
  const events = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      badge: "WEDDING",
      title: "Jamuan Pernikahan Premium",
      date: "12 Mei 2026",
      description: "Merayakan hari bahagia bersama keluarga tercinta dengan konsep prasmanan premium dan dekorasi adat Jawa modern yang anggun."
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      badge: "CORPORATE",
      title: "Gathering & Rapat Bisnis",
      date: "28 April 2026",
      description: "Jamuan makan siang prasmanan premium dan kopi rehat berkualitas untuk kegiatan rapat kerja instansi."
    }
  ];

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground tracking-wide uppercase">
          <Sparkles className="text-[#E87722]" size={16} /> MOMEN SPESIAL KAMI
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Dokumentasi berbagai kegiatan dan perayaan berharga yang pernah diselenggarakan di Kedai Elvera 57.
        </p>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
            <div className="relative h-48 w-full">
              <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 tracking-wider">
                {event.badge}
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="font-bold text-sm text-foreground leading-snug">{event.title}</h4>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">{event.date}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
