'use client';

import { useState } from 'react';

export interface DateRange {
  startDate: string;
  endDate: string;
}

type PresetKey =
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'last30'
  | 'last90'
  | 'ytd'
  | 'custom';

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'last90', label: 'Last 90 Days' },
  { key: 'ytd', label: 'YTD' },
  { key: 'custom', label: 'Custom' },
];

function getPresetRange(key: PresetKey): DateRange {
  const now = new Date();
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  switch (key) {
    case 'today':
      return { startDate: fmt(now), endDate: fmt(now) };
    case 'thisWeek': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { startDate: fmt(start), endDate: fmt(now) };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: fmt(start), endDate: fmt(now) };
    }
    case 'last30': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { startDate: fmt(start), endDate: fmt(now) };
    }
    case 'last90': {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      return { startDate: fmt(start), endDate: fmt(now) };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: fmt(start), endDate: fmt(now) };
    }
    default:
      return { startDate: fmt(now), endDate: fmt(now) };
  }
}

interface ReportDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function ReportDateRangePicker({ value, onChange }: ReportDateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('last30');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (key: PresetKey) => {
    setActivePreset(key);
    if (key === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(getPresetRange(key));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activePreset === preset.key
                ? 'bg-honey-500 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.startDate}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500"
          />
          <span className="text-neutral-400 text-sm">to</span>
          <input
            type="date"
            value={value.endDate}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500"
          />
        </div>
      )}
    </div>
  );
}

export { getPresetRange };
