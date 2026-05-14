/** [LOCKED] FINAL PRODUCTION BUILD - NO AGENT MODIFICATIONS ALLOWED **/
import React from 'react';
import { ChevronLeft, ChevronRight, Save, Layers } from 'lucide-react';
import GlossyButton from './GlossyButton';
import { ShiftType } from '../types';
import { cn } from './ui/utils';

interface SchedulerHeaderProps {
  onExportPDF?: () => void;
  onExportWeeklyPDF?: () => void;
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  view: 'grid' | 'pattern';
  onViewChange: (view: 'grid' | 'pattern') => void;
  onBack?: () => void;
  theme?: 'light' | 'dark';
}

const SchedulerHeader: React.FC<SchedulerHeaderProps> = ({
  onExportPDF,
  onExportWeeklyPDF,
  currentDate,
  onPreviousMonth,
  onNextMonth,
  view,
  onViewChange,
  onBack,
  theme = 'dark'
}) => {
  const monthYearString = currentDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric'
  });

  const handlePdfExport = () => {
    if (view === 'grid') {
      onExportPDF?.();
    } else {
      onExportWeeklyPDF?.();
    }
  };

  return (
    <div className={cn(
      "relative pt-10 pb-6 px-0 backdrop-blur-xl border-b rounded-b-[3.5rem] shadow-2xl transition-all duration-500",
      theme === 'dark' ? "bg-[#0a0a0c]/90 border-white/10" : "bg-white/90 border-slate-200"
    )}>
      {/* Subtle Background Decor */}
      <div className={cn(
        "absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] -mr-32 -mt-32 opacity-20",
        theme === 'dark' ? "bg-orange-500" : "bg-blue-500"
      )} />

      <div className="relative z-10 space-y-4 px-6">
        {/* Top Header: Back + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            aria-label="Kembali"
            className={cn(
              "h-10 w-10 p-0 rounded-xl border shadow-sm transition-all active:scale-90 flex items-center justify-center",
              theme === 'dark'
                ? "bg-slate-900 border-white/10 text-blue-400 hover:bg-blue-500 hover:text-white"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex flex-col text-left">
            <h2 className={cn(
              "text-xs font-black uppercase tracking-widest leading-none",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              {view === 'grid' ? "Jadwal Shift" : "Pola Mingguan"}
            </h2>
            <p className={cn(
              "text-[7px] font-bold uppercase tracking-[0.2em] mt-1 opacity-60",
              theme === 'dark' ? "text-blue-200" : "text-slate-500"
            )}>
              Rencana & Manajemen Operasional
            </p>
          </div>
        </div>

        {/* Navigation Bar (Month Selector) */}
        <div className={cn(
          "flex items-center justify-between p-1.5 rounded-xl border backdrop-blur-md",
          theme === 'dark' ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <button
            onClick={onPreviousMonth}
            aria-label="Bulan Sebelumnya"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90",
              theme === 'dark' ? "bg-white/5 text-orange-400" : "bg-white text-slate-600 shadow-sm"
            )}
          >
            <ChevronLeft size={16} strokeWidth={3} />
          </button>

          <h1 className={cn(
            "text-[10px] font-black tracking-[0.1em] uppercase",
            theme === 'dark' ? "text-orange-500" : "text-slate-900"
          )}>
            {monthYearString}
          </h1>

          <button
            onClick={onNextMonth}
            aria-label="Bulan Berikutnya"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90",
              theme === 'dark' ? "bg-white/5 text-orange-400" : "bg-white text-slate-600 shadow-sm"
            )}
          >
            <ChevronRight size={16} strokeWidth={3} />
          </button>
        </div>

        {/* View Switcher - Compact Pill Style */}
        <div className={cn(
          "flex p-1 rounded-xl border",
          theme === 'dark' ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <button
            onClick={() => onViewChange('grid')}
            className={cn(
              "flex-1 h-9 rounded-lg flex items-center justify-center text-[8px] font-black uppercase tracking-tight transition-all duration-300",
              view === 'grid'
                ? (theme === 'dark' ? "bg-blue-600 text-white shadow-lg" : "bg-blue-600 text-white shadow-lg")
                : "text-slate-500"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => onViewChange('pattern')}
            className={cn(
              "flex-1 h-9 rounded-lg flex items-center justify-center text-[8px] font-black uppercase tracking-tight transition-all duration-300",
              view === 'pattern'
                ? (theme === 'dark' ? "bg-indigo-600 text-white shadow-lg" : "bg-indigo-900 text-white shadow-lg")
                : "text-slate-500"
            )}
          >
            Weekly
          </button>
        </div>

        {/* Legend: Horizontal Pill Legend */}
        <div className="flex items-center justify-center gap-6 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-lg bg-blue-600 flex items-center justify-center text-[7px] font-black text-white shadow-sm border border-blue-400">P</div>
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest">Pagi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-lg bg-emerald-600 flex items-center justify-center text-[7px] font-black text-white shadow-sm border border-emerald-400">M</div>
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest">Middle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-lg bg-rose-500 flex items-center justify-center text-[7px] font-black text-white shadow-sm border border-rose-400">O</div>
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest">Libur</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulerHeader;
