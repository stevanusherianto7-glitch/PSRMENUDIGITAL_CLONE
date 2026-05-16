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

  const getShiftStyles = (type: ShiftType) => {
    switch (type) {
      case ShiftType.PAGI:
        return "bg-blue-600 text-white border-blue-400";
      case ShiftType.MIDDLE:
        return "bg-emerald-600 text-white border-emerald-400";
      case ShiftType.LIBUR:
        return "bg-rose-500 text-white border-rose-400";
      default:
        return "bg-secondary text-muted-foreground/40 border-border";
    }
  };

  const getShiftLabel = (type: ShiftType) => {
    switch (type) {
      case ShiftType.PAGI: return "P";
      case ShiftType.MIDDLE: return "M";
      case ShiftType.LIBUR: return "O";
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
    <div className="space-y-6 mb-24">
      <div className="bg-card rounded-[2rem] shadow-xl border border-border overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="sticky left-0 z-40 bg-card p-4 text-left border-b border-r border-border min-w-[160px]">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">KARYAWAN</span>
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
                      "p-2 border-b border-border min-w-[32px] text-center",
                      isToday ? "bg-blue-500/5" : (isWeekend ? "bg-rose-500/5" : "")
                    )}>
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tight mb-0.5",
                          isWeekend ? "text-rose-400" : "text-muted-foreground"
                        )}>
                          {dayName}
                        </span>
                        <span className={cn(
                          "text-xs font-black tabular-nums",
                          isToday ? "text-blue-500" : (isWeekend ? "text-rose-500" : "text-foreground")
                        )}>
                          {dayNum}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="sticky left-0 z-30 bg-card p-4 border-r border-border min-w-[160px]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-foreground uppercase leading-none mb-1">
                        {emp.name}
                      </span>
                      <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
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
                        "p-1 text-center min-w-[32px]",
                        isWeekend ? "bg-rose-500/5" : ""
                      )}>
                        <button
                          onClick={() => onShiftClick(emp.id, dateStr, nextShift(shiftType))}
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 shadow-sm border text-[9px] font-black",
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
        <Button
          onClick={onExportPDF}
          className="w-full h-14 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 font-black text-[9px] tracking-[0.2em] shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all border-none"
        >
          <FileDown size={16} />
          UNDUH JADWAL BULANAN (PDF)
        </Button>
      )}
    </div>
  );
}
