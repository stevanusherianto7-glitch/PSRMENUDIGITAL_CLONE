import * as React from "react";
import { Employee, ShiftType } from "../types";
import { cn } from "./ui/utils";
import { FileDown } from "lucide-react";
import { Button } from "./ui/button";

interface ScheduleGridProps {
  employees: Employee[];
  shifts: Record<string, Record<string, ShiftType>>;
  dates: string[];
  onShiftClick: (employeeId: string, dateStr: string, currentType: ShiftType) => void;
  onExportPDF?: () => void;
}

export default function ScheduleGrid({ employees, shifts, dates, onShiftClick, onExportPDF }: ScheduleGridProps) {

  // Warna shift yang soft, pastel, dan premium (Anti-Glitch & Ramah Mata)
  const getShiftStyles = (type: ShiftType) => {
    switch (type) {
      case ShiftType.PAGI:
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20";
      case ShiftType.MIDDLE:
        return "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20";
      case ShiftType.LIBUR:
        return "bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20";
      default:
        return "bg-secondary text-muted-foreground border-border/40 hover:bg-secondary/80";
    }
  };

  const getShiftLabel = (type: ShiftType) => {
    switch (type) {
      case ShiftType.PAGI: return "PAGI";
      case ShiftType.MIDDLE: return "MIDL";
      case ShiftType.LIBUR: return "OFF";
      default: return "-";
    }
  };

  const nextShift = (current: ShiftType): ShiftType => {
    const sequence = [ShiftType.PAGI, ShiftType.MIDDLE, ShiftType.LIBUR];
    const idx = sequence.indexOf(current);
    if (idx === -1 || idx === sequence.length - 1) return sequence[0];
    return sequence[idx + 1];
  };

  return (
    <div className="space-y-4 mb-20">
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                {/* Sticky Column untuk Nama Karyawan di HP */}
                <th className="sticky left-0 z-40 bg-card p-4 text-left border-r border-border/60 min-w-[140px] shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Karyawan</span>
                </th>
                {dates.map((dateStr) => {
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase();
                  const dayNum = date.getDate();
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;

                  return (
                    <th key={dateStr} className={cn(
                      "p-3 border-b border-border/60 min-w-[50px] text-center transition-colors",
                      isToday ? "bg-primary/5" : (isWeekend ? "bg-rose-500/5" : "")
                    )}>
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tight mb-0.5",
                          isWeekend ? "text-rose-400" : "text-muted-foreground"
                        )}>
                          {dayName}
                        </span>
                        <span className={cn(
                          "text-xs font-black font-poppins tabular-nums",
                          isToday ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]" : (isWeekend ? "text-rose-500" : "text-foreground")
                        )}>
                          {dayNum}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-secondary/10 transition-colors group">
                  <td className="sticky left-0 z-30 bg-card p-4 border-r border-border/60 min-w-[140px] shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-foreground uppercase leading-none mb-1 truncate" title={emp.name}>
                        {emp.name}
                      </span>
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-70">
                        {emp.role}
                      </span>
                    </div>
                  </td>
                  {dates.map((dateStr) => {
                    const shiftType = (shifts[emp.id] && shifts[emp.id][dateStr]) || ShiftType.LIBUR;
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <td key={dateStr} className={cn(
                        "p-1.5 text-center min-w-[50px]",
                        isWeekend ? "bg-rose-500/[0.02]" : ""
                      )}>
                        <button
                          onClick={() => onShiftClick(emp.id, dateStr, nextShift(shiftType))}
                          className={cn(
                            "w-10 h-7 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 border text-[9px] font-black tracking-tighter",
                            getShiftStyles(shiftType)
                          )}
                        >
                          {getShiftLabel(shiftType)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {onExportPDF && (
        <button
          onClick={onExportPDF}
          className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 active:scale-98 font-black text-[10px] tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all border-none uppercase"
        >
          <FileDown size={14} />
          Unduh Jadwal Bulanan (PDF)
        </button>
      )}
    </div>
  );
}
  );
}
