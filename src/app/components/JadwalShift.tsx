import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShiftType, Employee, Attendance } from '../types';
import PatternManager from './PatternManager';
import { exportMonthlyPDF, exportWeeklyPDF } from '../../utils/exportUtils';
import { AttendanceGrid } from './AttendanceGrid';
import ScheduleGrid from './ScheduleGrid';
import HeaderJadwal from './HeaderJadwal';
import type { DateRange } from "react-day-picker";

// Helper to get all dates in a month
function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    dates.push(date.toISOString().slice(0, 10));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

// Helper to map ShiftStatus ('P'|'M'|'O') to ShiftType enum
function mapStatusToType(status: string): ShiftType {
  switch (status) {
    case 'P': return ShiftType.PAGI;
    case 'M': return ShiftType.MIDDLE;
    case 'O': return ShiftType.LIBUR;
    default: return ShiftType.LIBUR;
  }
}

export const JadwalShift = ({ dateRange }: { dateRange: DateRange | undefined }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'grid' | 'pattern'>('grid');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Record<string, Record<string, ShiftType>>>({});
  const [patterns, setPatterns] = useState<Record<string, ShiftType[]>>({});
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  const dates = getDatesInMonth(currentDate.getFullYear(), currentDate.getMonth());

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('jadwal_shift')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (data && data.length > 0) {
        setEmployees(data.map((d: any) => ({
          id: d.id,
          name: d.employee_name,
          role: d.role
        })));

        // Build patterns and shifts
        const newPatterns: Record<string, ShiftType[]> = {};
        const newShifts: Record<string, Record<string, ShiftType>> = {};

        data.forEach((d: any) => {
          const schedule = d.schedule as string[]; // e.g. ['P', 'P', 'M', 'M', 'O', 'P', 'P']
          const types = schedule.map(mapStatusToType);
          newPatterns[d.id] = types;

          // Map to current month dates
          newShifts[d.id] = {};
          dates.forEach(dateStr => {
            const date = new Date(dateStr);
            // JavaScript getDay() returns 0 for Sunday, 1 for Monday, etc.
            // Our array index 0 is Monday, 6 is Sunday.
            const dayIdx = (date.getDay() + 6) % 7;
            newShifts[d.id][dateStr] = types[dayIdx] || ShiftType.LIBUR;
          });
        });

        setPatterns(newPatterns);
        setShifts(newShifts);

        // Fetch Attendances dari Supabase
        const { data: attData, error: attError } = await supabase
          .from('attendances')
          .select('*');

        if (attData) {
          setAttendances(attData.map((a: any) => ({
            employeeId: a.employee_id,
            date: a.date,
            status: a.status
          })));
        }
      } else {
        // Fallback data if empty
        const fallback = [
          { id: '1', employee_name: 'Budi Santoso', role: 'Kasir', schedule: ['P', 'P', 'M', 'M', 'O', 'P', 'P'] },
          { id: '2', employee_name: 'Siti Aminah', role: 'Waiter', schedule: ['M', 'M', 'O', 'P', 'P', 'M', 'M'] },
          { id: '3', employee_name: 'Agus Setiawan', role: 'Chef', schedule: ['P', 'O', 'P', 'P', 'M', 'M', 'O'] },
        ];
        
        setEmployees(fallback.map(d => ({ id: d.id, name: d.employee_name, role: d.role })));
        
        const newPatterns: Record<string, ShiftType[]> = {};
        const newShifts: Record<string, Record<string, ShiftType>> = {};

        fallback.forEach(d => {
          const types = d.schedule.map(mapStatusToType);
          newPatterns[d.id] = types;
          newShifts[d.id] = {};
          dates.forEach(dateStr => {
            const date = new Date(dateStr);
            const dayIdx = (date.getDay() + 6) % 7;
            newShifts[d.id][dateStr] = types[dayIdx] || ShiftType.LIBUR;
          });
        });

        setPatterns(newPatterns);
        setShifts(newShifts);
      }
      setLoading(false);
    }
    loadData();
  }, [currentDate]);

  const handleShiftClick = (employeeId: string, dateStr: string, nextType: ShiftType) => {
    setShifts(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [dateStr]: nextType
      }
    }));
  };

  const handleToggleAttendance = async (employeeId: string, date: string, status: Attendance['status']) => {
    // Update local state untuk respons cepat UI
    setAttendances(prev => {
      const filtered = prev.filter(a => !(a.employeeId === employeeId && a.date === date));
      return [...filtered, { employeeId, date, status }];
    });

    // Simpan ke Supabase
    const { error } = await supabase
      .from('attendances')
      .upsert({
        employee_id: employeeId,
        date: date,
        status: status
      }, { onConflict: 'employee_id,date' });

    if (error) {
      console.error("Error saving attendance:", error);
    }
  };

  const handleSavePattern = async (newPattern: Record<string, ShiftType[]>) => {
    setPatterns(newPattern);
    
    // Save to Supabase
    for (const empId in newPattern) {
      const schedule = newPattern[empId].map(t => {
        if (t === ShiftType.PAGI) return 'P';
        if (t === ShiftType.MIDDLE) return 'M';
        return 'O';
      });
      
      const { error } = await supabase
        .from('jadwal_shift')
        .update({ schedule })
        .eq('id', empId);
        
      if (error) console.error("Error saving pattern:", error);
    }
    
    setView('grid');
  };

  const handleApplyPattern = (newPattern: Record<string, ShiftType[]>) => {
    // Re-generate shifts based on the new pattern
    const newShifts: Record<string, Record<string, ShiftType>> = {};
    employees.forEach(emp => {
      newShifts[emp.id] = {};
      dates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayIdx = (date.getDay() + 6) % 7;
        newShifts[emp.id][dateStr] = newPattern[emp.id][dayIdx] || ShiftType.LIBUR;
      });
    });
    setShifts(newShifts);
    setView('grid');
  };

  const handleExportMonthlyPDF = () => {
    exportMonthlyPDF(currentDate, dates, employees, shifts);
  };

  const handleExportWeeklyPDF = (effectiveDate?: string) => {
    exportWeeklyPDF(effectiveDate, employees, patterns);
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const getAlphaCount = (employeeId: string) => {
    return attendances.filter(a => {
      if (a.employeeId !== employeeId || a.status !== 'Alpha') return false;
      if (!dateRange || !dateRange.from || !dateRange.to) return true;
      const d = new Date(a.date);
      const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
      const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
      return d >= from && d <= to;
    }).length;
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      <HeaderJadwal 
        currentDate={currentDate}
        onPreviousMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        view={view}
        onViewChange={setView}
      />
      
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        view === 'grid' ? (
          <div className="space-y-10 px-2 lg:px-10 pb-20">
            {/* Summary Bolos - Redesigned Ultra-Sleek */}
            <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 shadow-2xl border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
                <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Absence Matrix (Alpha)</h3>
              </div>

              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {employees.map(emp => {
                  const count = getAlphaCount(emp.id);
                  return (
                    <div key={emp.id} className="flex-shrink-0 flex items-center gap-4 bg-secondary/50 border border-border px-5 py-3 rounded-2xl group hover:border-rose-500/30 transition-all duration-500">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center font-black text-[10px] text-muted-foreground border border-border group-hover:text-rose-400 transition-colors">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">{emp.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">{emp.role}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${count > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-muted border-border text-muted-foreground'}`}>
                            {count} DAYS
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ScheduleGrid 
              employees={employees}
              shifts={shifts}
              dates={dates}
              onShiftClick={handleShiftClick}
              onExportPDF={handleExportMonthlyPDF}
            />
            <AttendanceGrid 
              employees={employees}
              attendances={attendances}
              onToggleAttendance={handleToggleAttendance}
            />
          </div>
        ) : (
          <div className="px-4 lg:px-10 pb-20">
            <PatternManager
              employees={employees}
              initialPattern={patterns}
              onSavePattern={handleSavePattern}
              onApplyPattern={handleApplyPattern}
              onBack={() => setView('grid')}
              currentDate={currentDate}
              onExportWeeklyPDF={handleExportWeeklyPDF}
            />
          </div>
        )
      )}
    </div>
  );
};
