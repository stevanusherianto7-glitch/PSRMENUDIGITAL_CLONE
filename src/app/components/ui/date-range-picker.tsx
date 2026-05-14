"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "./utils";
import { Calendar } from "./calendar";
import { Button } from "./button";

interface DateRangePickerProps {
  onSelect?: (range: DateRange | undefined) => void;
  onClose?: () => void;
  className?: string;
}

const presets = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Yesterday", getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: "This Week", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "Last Week", getValue: () => {
      const lastWeek = subDays(new Date(), 7);
      return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    } 
  },
  { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last Month", getValue: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    } 
  },
];

export function DateRangePicker({ onSelect, onClose, className }: DateRangePickerProps) {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [activePreset, setActivePreset] = React.useState<string>("Today");
  const [isAllDay, setIsAllDay] = React.useState(true);
  const [fromTime, setFromTime] = React.useState("08:00");
  const [toTime, setToTime] = React.useState("17:00");

  const hoursArray = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 24; i++) {
      const hourStr = i.toString().padStart(2, '0');
      arr.push(`${hourStr}:00`);
      arr.push(`${hourStr}:30`);
    }
    return arr;
  }, []);

  const handlePresetClick = (preset: typeof presets[0]) => {
    const val = preset.getValue();
    setRange(val);
    setActivePreset(preset.label);
  };

  const handleApply = () => {
    if (onSelect && range) {
      const finalRange = { ...range };
      if (finalRange.from) {
        const fromDate = new Date(finalRange.from);
        if (isAllDay) {
          fromDate.setHours(0, 0, 0, 0);
        } else {
          const [h, m] = fromTime.split(":").map(Number);
          fromDate.setHours(h, m, 0, 0);
        }
        finalRange.from = fromDate;
      }
      if (finalRange.to) {
        const toDate = new Date(finalRange.to);
        if (isAllDay) {
          toDate.setHours(23, 59, 59, 999);
        } else {
          const [h, m] = toTime.split(":").map(Number);
          toDate.setHours(h, m, 0, 0);
        }
        finalRange.to = toDate;
      }
      onSelect(finalRange);
    }
    if (onClose) onClose();
  };

  return (
    <div className={cn("bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col", className)}>
      {/* Header */}
      <div className="bg-[#FFF5F8] p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Ubah Range Tanggal</h3>
      </div>

      <div className="flex flex-1 min-h-[320px]">
        {/* Left Sidebar - Presets */}
        <div className="w-40 border-r border-border p-2 space-y-1">
          {presets.map((preset) => {
            const isActive = activePreset === preset.label;
            return (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                  isActive
                    ? "bg-pink-50 text-[#EC4899]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            );
          })}

          <div className="border-t border-border mt-4 pt-4 px-2 space-y-3">
            <div className="flex items-center gap-2">
              <input type="text" value="1" title="Days up to today" className="w-10 h-8 border border-border rounded-lg text-center text-sm" readOnly />
              <span className="text-xs text-muted-foreground">days up to today</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value="1" title="Days starting today" className="w-10 h-8 border border-border rounded-lg text-center text-sm" readOnly />
              <span className="text-xs text-muted-foreground">days starting today</span>
            </div>
          </div>
        </div>

        {/* Right Content - Calendar */}
        <div className="flex-1 p-4 flex flex-col gap-4">
          {/* Display boxes */}
          <div className="flex gap-2">
            <div className="flex-1 h-10 border border-[#EC4899] rounded-lg flex items-center justify-center text-sm font-medium text-[#EC4899]">
              {range?.from ? format(range.from, "MMM dd, yyyy") : "Start Date"}
            </div>
            <div className="flex-1 h-10 border border-border rounded-lg flex items-center justify-center text-sm font-medium text-muted-foreground">
              {range?.to ? format(range.to, "MMM dd, yyyy") : "End Date"}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex items-center justify-center">
            <Calendar
              mode="range"
              selected={range}
              onSelect={(val) => {
                setRange(val);
                setActivePreset("");
              }}
              className="border-0"
              fixedWeeks={true}
              classNames={{
                day_selected: "bg-[#EC4899] text-white hover:bg-[#D946EF] hover:text-white focus:bg-[#EC4899] focus:text-white",
                day_range_start: "day-range-start bg-[#EC4899] text-white rounded-l-md",
                day_range_end: "day-range-end bg-[#EC4899] text-white rounded-r-md",
                day_range_middle: "aria-selected:bg-pink-50 aria-selected:text-[#EC4899]",
                day_today: "bg-pink-100 text-[#EC4899] font-bold",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex justify-between items-center bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setIsAllDay(!isAllDay)}
            className={cn(
              "border rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              isAllDay
                ? "bg-[#EC4899] text-white border-transparent"
                : "border-[#EC4899] text-[#EC4899] hover:bg-pink-50"
            )}
          >
            All Day
          </Button>

          {!isAllDay && (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span>From:</span>
              <select
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="border border-border rounded-lg px-2 py-1 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-[#EC4899]"
                title="Waktu Mulai"
              >
                {hoursArray.map((time) => (
                  <option key={`from-${time}`} value={time}>{time.replace(':', '.')}</option>
                ))}
              </select>

              <span>To:</span>
              <select
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="border border-border rounded-lg px-2 py-1 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-[#EC4899]"
                title="Waktu Selesai"
              >
                {hoursArray.map((time) => (
                  <option key={`to-${time}`} value={time}>{time.replace(':', '.')}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <Button
          onClick={handleApply}
          variant="outline"
          className="border border-border hover:bg-secondary rounded-lg px-6"
        >
          OK
        </Button>
      </div>
    </div>
  );
}
