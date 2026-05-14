import React from 'react';
import { ShiftType } from '../types';
import { SHIFT_CONFIGS } from '../constants';

interface GlossyButtonProps {
  type: ShiftType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  selected?: boolean;
}

const GlossyButton: React.FC<GlossyButtonProps> = ({ type, size = 'md', onClick, selected = false }) => {
  const config = SHIFT_CONFIGS[type];
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-bold',
    lg: 'w-14 h-14 text-base font-bold', // For modal selection
    xl: 'w-16 h-16 text-xl font-bold',
  };

  const selectedRing = selected ? `ring-2 ring-offset-2 ring-yellow-400` : '';

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-full flex items-center justify-center overflow-hidden
        bg-gradient-to-b ${config.colorFrom} ${config.colorTo}
        ${config.textColor} shadow-md active:scale-95 transition-transform duration-100
        ${sizeClasses[size]}
        ${selectedRing}
        border border-white/10
        transform-gpu
      `}
    >
      {/* Glossy Reflection Effect */}
      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
      
      {/* Inner shadow for depth */}
      <div className="absolute inset-0 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] pointer-events-none" />

      <span className="relative z-10 drop-shadow-sm">{config.code}</span>
    </button>
  );
};

export default GlossyButton;
