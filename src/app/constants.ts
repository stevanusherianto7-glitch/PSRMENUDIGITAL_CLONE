import { ShiftType } from '../types';

export const SHIFT_CONFIGS = {
  [ShiftType.PAGI]: {
    colorFrom: 'from-blue-500',
    colorTo: 'to-blue-600',
    textColor: 'text-white',
    code: 'P',
  },
  [ShiftType.MIDDLE]: {
    colorFrom: 'from-emerald-500',
    colorTo: 'to-emerald-600',
    textColor: 'text-white',
    code: 'M',
  },
  [ShiftType.LIBUR]: {
    colorFrom: 'from-rose-500',
    colorTo: 'to-rose-600',
    textColor: 'text-white',
    code: 'O',
  },
};
