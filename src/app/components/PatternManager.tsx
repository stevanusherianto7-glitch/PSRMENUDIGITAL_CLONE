import * as React from "react";
import { Employee, ShiftType } from "../types";
import { cn } from "./ui/utils";
import { Save, Layers, Info, FileDown, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface PatternManagerProps {
  employees: Employee[];
  initialPattern: Record<string, ShiftType[]>;
  onSavePattern: (pattern: Record<string, ShiftType[]>) => void;
  onApplyPattern: (pattern: Record<string, ShiftType[]>) => void;
  onExportWeeklyPDF?: (effectiveDate?: string) => void;
  onBack: () => void;
  currentDate: Date;
}

const DAYS = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];

export default function PatternManager({
  employees,
  initialPattern,
  onSavePattern,
  onApplyPattern,
  onExportWeeklyPDF,
  onBack,
  currentDate
}: PatternManagerProps) {
  const [localPattern, setLocalPattern] = React.useState<Record<string, ShiftType[]>>(initialPattern || {});
  const [effectiveDate, setEffectiveDate] = React.useState<string>("");

  // Initialize pattern if empty
  React.useEffect(() => {
    if (Object.keys(localPattern).length === 0) {
      const init: Record<string, ShiftType[]>= {};
      employees.forEach(emp => {
        init[emp.id] = Array(7).fill(ShiftType.LIBUR);
      });
      setLocalPattern(init);
    }
  }, [employees]);

  const handleCyclePattern = (empId: string, dayIndex: number) => {
    const SHIFT_ORDER = [ShiftType.PAGI, ShiftType.MIDDLE, ShiftType.LIBUR];
    const currentType = (localPattern[empId] && localPattern[empId][dayIndex]) || ShiftType.LIBUR;
    const nextIndex = (SHIFT_ORDER.indexOf(currentType) + 1) % SHIFT_ORDER.length;
    const nextType = SHIFT_ORDER[nextIndex];

    setLocalPattern(prev => {
      const newEmpPattern = [...(prev[empId] || Array(7).fill(ShiftType.LIBUR))];
      newEmpPattern[dayIndex] = nextType;
      return {
        ...prev,
        [empId]: newEmpPattern
      };
    });
  };

  const getShiftStyles = (type: ShiftType) => {
    switch (type) {
      case ShiftType.PAGI:
        return "bg-blue-600 text-white border-blue-400";
      case ShiftType.MIDDLE:
        return "bg-emerald-600 text-white border-emerald-400";
      case ShiftType.LIBUR:
        return "bg-rose-500 text-white border-rose-400";
      default:
        return "bg-slate-50 text-slate-300 border-slate-100";
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

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
      {/* Warning/Info Box: Light Style */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
          Atur jadwal standar untuk 1 minggu. Pola ini akan <span className="font-black underline">diulang setiap minggu</span> dalam sebulan (setiap Senin akan mendapat pola Senin, dst.) untuk mempercepat pengisian jadwal.
        </p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="max-h-[50vh] overflow-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="sticky left-0 z-40 bg-white p-4 text-left border-b border-r border-slate-100 min-w-[160px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Karyawan</span>
                </th>
                {DAYS.map((day, idx) => (
                  <th key={day} className={cn(
                    "p-2 border-b border-slate-100 text-center min-w-[32px]",
                    idx >= 5 ? "bg-rose-50/30" : ""
                  )}>
                    <div className={cn(
                      "text-[8px] font-black tracking-widest uppercase",
                      idx >= 5 ? "text-rose-500" : "text-slate-400"
                    )}>
                      {day}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="sticky left-0 z-30 bg-white p-4 border-r border-slate-100 min-w-[160px]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-800 uppercase whitespace-nowrap leading-none mb-1">
                        {emp.name}
                      </span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                        {emp.role}
                      </span>
                    </div>
                  </td>
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                    const shiftType = (localPattern[emp.id] && localPattern[emp.id][dayIdx]) || ShiftType.LIBUR;
                    const isWeekend = dayIdx >= 5;
                    return (
                      <td key={dayIdx} className={cn(
                        "p-1 text-center min-w-[32px]",
                        isWeekend ? "bg-rose-50/10" : ""
                      )}>
                        <button
                          onClick={() => handleCyclePattern(emp.id, dayIdx)}
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

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pb-8">
        <Button
          onClick={() => onSavePattern(localPattern)}
          className="h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-[11px] tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          SIMPAN POLA
        </Button>

        <Button
          onClick={() => onApplyPattern(localPattern)}
          className="h-14 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-black text-[11px] tracking-[0.2em] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Layers className="w-4 h-4" />
          TERAPKAN KE BULAN INI
        </Button>

        {/* Kotak Input Keterangan Tanggal */}
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2 mt-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Berlaku Mulai Tanggal
          </label>
          <Input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="h-12 bg-white border-slate-200 rounded-xl text-[11px] font-bold text-slate-900"
          />
        </div>

        {onExportWeeklyPDF && (
          <Button
            onClick={() => onExportWeeklyPDF(effectiveDate)}
            className="h-14 rounded-2xl bg-slate-900 text-white hover:bg-black active:scale-95 font-black text-[9px] tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all border-none"
          >
            <FileDown size={16} />
            UNDUH POLA MINGGUAN (PDF)
          </Button>
        )}
      </div>
    </div>
  );
}
