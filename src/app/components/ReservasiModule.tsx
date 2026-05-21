import React, { useState, useMemo } from "react";
import { Search, Calendar, Clock, Users, Check, X, Phone, MessageSquare, AlertCircle, Info } from "lucide-react";

interface Reservation {
  id: string;
  name: string;
  phone: string;
  type: string;
  guests: number;
  date: string;
  time: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
}

interface ReservasiModuleProps {
  reservations: Reservation[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
}

export function ReservasiModule({ reservations, onUpdateStatus }: ReservasiModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});

  // Summary statistics
  const stats = useMemo(() => {
    const total = reservations.length;
    const pending = reservations.filter((r) => r.status === "pending").length;
    const approved = reservations.filter((r) => r.status === "approved").length;
    const rejected = reservations.filter((r) => r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [reservations]);

  // Handle Approve/Reject with loading state and robustness
  const handleStatusChange = async (id: string, status: "approved" | "rejected") => {
    setProcessingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await onUpdateStatus(id, status);
    } catch (err) {
      console.error("Error updating status in component:", err);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Filter reservations based on search term and status tab
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.phone.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg tracking-tight">Manajemen Reservasi</h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            Kelola dan konfirmasi pemesanan tempat meja pelanggan secara realtime.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 shadow-sm backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl -mr-5 -mt-5" />
          <div className="flex justify-between items-start">
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Menunggu</p>
            {stats.pending > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p className="font-extrabold text-2xl text-amber-500 mt-2 font-['Poppins']">{stats.pending}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Perlu konfirmasi segera</p>
        </div>

        {/* Approved Card */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 shadow-sm backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:shadow-emerald-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -mr-5 -mt-5" />
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Disetujui</p>
          <p className="font-extrabold text-2xl text-emerald-500 mt-2 font-['Poppins']">{stats.approved}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Sudah dialokasikan meja</p>
        </div>

        {/* Rejected Card */}
        <div className="bg-rose-500/5 border border-rose-500/15 rounded-2xl p-4 shadow-sm backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:shadow-rose-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-3xl -mr-5 -mt-5" />
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Ditolak</p>
          <p className="font-extrabold text-2xl text-rose-500 mt-2 font-['Poppins']">{stats.rejected}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Dibatalkan atau ditolak</p>
        </div>

        {/* Total Card */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 shadow-sm backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:shadow-primary/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-5 -mt-5" />
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Total Reservasi</p>
          <p className="font-extrabold text-2xl text-primary mt-2 font-['Poppins']">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Seluruh reservasi terdaftar</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Cari nama atau nomor telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-secondary/50 p-1 rounded-xl border border-border gap-1 self-start md:self-auto">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => {
            const label =
              status === "all"
                ? "Semua"
                : status === "pending"
                ? "Pending"
                : status === "approved"
                ? "Disetujui"
                : "Ditolak";
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/20 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid List */}
      {filteredReservations.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">
            <Info size={24} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Tidak Ada Reservasi</h4>
            <p className="text-muted-foreground text-xs mt-1">
              {searchTerm || statusFilter !== "all"
                ? "Tidak ada data reservasi yang cocok dengan filter atau pencarian Anda."
                : "Belum ada data reservasi masuk saat ini."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReservations.map((res) => {
            const isPending = res.status === "pending";
            const isApproved = res.status === "approved";
            const isRejected = res.status === "rejected";
            const isProcessing = processingIds[res.id] || false;

            return (
              <div
                key={res.id}
                className={`bg-card border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative ${
                  isPending
                    ? "border-amber-500/20 shadow-sm hover:border-amber-500/40 hover:shadow-amber-500/5 hover:-translate-y-1"
                    : isApproved
                    ? "border-emerald-500/10 hover:border-emerald-500/30 hover:-translate-y-1"
                    : "border-border/60 hover:-translate-y-1 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Pending Accent Pulse */}
                {isPending && (
                  <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-amber-500 animate-pulse -mt-1 -mr-1" />
                )}

                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-sm tracking-tight text-foreground">{res.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        <Phone size={12} className="text-muted-foreground/60" />
                        <span>{res.phone}</span>
                        {res.phone && (
                          <a
                            href={`https://wa.me/${res.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline ml-1 inline-flex items-center"
                          >
                            Chat
                          </a>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        res.type.toLowerCase().includes("vip")
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {res.type}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-2.5 rounded-xl border border-border/40 text-xs">
                    <div className="flex flex-col items-center justify-center text-center p-1">
                      <Calendar size={14} className="text-muted-foreground mb-1" />
                      <span className="font-semibold text-[10px] text-foreground">{res.date}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center border-x border-border/50 p-1">
                      <Clock size={14} className="text-muted-foreground mb-1" />
                      <span className="font-semibold text-[10px] text-foreground">{res.time}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center p-1">
                      <Users size={14} className="text-muted-foreground mb-1" />
                      <span className="font-bold text-[10px] text-foreground">{res.guests} Pax</span>
                    </div>
                  </div>

                  {/* Special Notes */}
                  {res.notes && (
                    <div className="bg-secondary/40 border-l-2 border-primary/70 p-3 rounded-r-xl text-[11px] leading-relaxed text-muted-foreground flex gap-2 items-start italic">
                      <MessageSquare size={12} className="text-primary/70 shrink-0 mt-0.5" />
                      <span>"{res.notes}"</span>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons / Status Badge */}
                <div className="mt-5 pt-4 border-t border-border/50 flex justify-between items-center gap-3">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleStatusChange(res.id, "rejected")}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-500/10 disabled:opacity-50 transition-all active:scale-[0.98]"
                      >
                        <X size={14} />
                        Tolak
                      </button>
                      <button
                        onClick={() => handleStatusChange(res.id, "approved")}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 disabled:opacity-50 shadow-md shadow-emerald-950/20 transition-all active:scale-[0.98]"
                      >
                        {isProcessing ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Setujui
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-center py-1.5 rounded-xl border text-xs font-bold">
                      {isApproved ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <Check size={14} /> Reservasi Disetujui
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <X size={14} /> Reservasi Ditolak
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
