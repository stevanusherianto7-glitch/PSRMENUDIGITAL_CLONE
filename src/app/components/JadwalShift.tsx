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
    <div className="p-6">
      <HeaderJadwal 
        currentDate={currentDate}
        onPreviousMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        view={view}
        onViewChange={setView}
      />
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        view === 'grid' ? (
          <div className="space-y-6">
            {/* Summary Bolos */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">Ringkasan Hari Bolos (Alpha)</h3>
              <div className="grid grid-cols-4 gap-3">
                {employees.map(emp => (
                  <div key={emp.id} className="flex justify-between items-center p-2.5 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.role}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">{getAlphaCount(emp.id)} Hari</span>
                  </div>
                ))}
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
          <PatternManager 
            employees={employees}
            initialPattern={patterns}
            onSavePattern={handleSavePattern}
            onApplyPattern={handleApplyPattern}
            onBack={() => setView('grid')}
            currentDate={currentDate}
            onExportWeeklyPDF={handleExportWeeklyPDF}
          />
        )
      )}
    </div>
  );
};
