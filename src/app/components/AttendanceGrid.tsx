import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { id } from "date-fns/locale";
import { Employee, Attendance } from "../types";
import { cn } from "./ui/utils";
import { Check, X, Clock, AlertCircle } from "lucide-react";

interface AttendanceGridProps {
  employees: Employee[];
  attendances: Attendance[];
  onToggleAttendance: (employeeId: string, date: string, status: Attendance['status']) => void;
}

export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  employees,
  attendances,
  onToggleAttendance,
}) => {
  const [currentMonth] = React.useState(new Date());

  const daysInMonth = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getStatusColor = (status: Attendance['status']) => {
    switch (status) {
      case 'Hadir': return 'bg-emerald-500 text-white';
      case 'Izin': return 'bg-amber-500 text-white';
      case 'Sakit': return 'bg-blue-500 text-white';
      case 'Alpha': return 'bg-rose-500 text-white';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  const getStatusIcon = (status: Attendance['status']) => {
    switch (status) {
      case 'Hadir': return <Check className="w-3 h-3" />;
      case 'Izin': return <Clock className="w-3 h-3" />;
      case 'Sakit': return <AlertCircle className="w-3 h-3" />;
      case 'Alpha': return <X className="w-3 h-3" />;
      default: return null;
    }
  };

  const nextStatus = (currentStatus?: Attendance['status']): Attendance['status'] => {
    const sequence: Attendance['status'][] = ['Hadir', 'Izin', 'Sakit', 'Alpha'];
    if (!currentStatus) return 'Hadir';
    const index = sequence.indexOf(currentStatus);
    if (index === -1 || index === sequence.length - 1) return 'Hadir';
    return sequence[index + 1];
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex flex-col gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Log Presensi Kehadiran</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {['Hadir', 'Izin', 'Sakit', 'Alpha'].map((s) => (
             <div key={s} className="flex items-center gap-1.5">
               <div className={cn("w-2 h-2 rounded-full",
                 s === 'Hadir' ? "bg-emerald-500" :
                 s === 'Izin' ? "bg-amber-500" :
                 s === 'Sakit' ? "bg-blue-500" : "bg-rose-500"
               )} />
               <span className="text-[9px] font-black uppercase text-slate-400">{s}</span>
             </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="sticky left-0 z-10 bg-slate-50 p-4 text-left border-b border-r border-slate-100 min-w-[150px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Karyawan</span>
              </th>
              {daysInMonth.map((day) => (
                <th key={day.toISOString()} className="p-2 border-b border-slate-100 min-w-[40px]">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase">{format(day, 'EEE', { locale: id })}</span>
                    <span className="text-[11px] font-black text-slate-900">{format(day, 'dd')}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="sticky left-0 z-10 bg-white p-4 border-b border-r border-slate-100">
                  <span className="text-[11px] font-black uppercase text-slate-700">{emp.name}</span>
                </td>
                {daysInMonth.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const attendance = attendances.find(a => a.employeeId === emp.id && a.date === dateStr);

                  return (
                    <td key={dateStr} className="p-1 border-b border-slate-100 text-center">
                      <button
                        onClick={() => onToggleAttendance(emp.id, dateStr, nextStatus(attendance?.status))}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 shadow-sm",
                          attendance ? getStatusColor(attendance.status) : "bg-slate-50 text-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {attendance ? getStatusIcon(attendance.status) : <div className="w-1 h-1 rounded-full bg-slate-300" />}
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
  );
};
