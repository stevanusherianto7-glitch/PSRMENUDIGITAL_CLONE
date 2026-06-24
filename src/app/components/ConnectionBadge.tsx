import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionBadgeProps {
  connected: boolean;
}

export function ConnectionBadge({ connected }: ConnectionBadgeProps) {
  return (
    <div 
      className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
        connected 
          ? "bg-green-500/10 border-green-500/20 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
          : "bg-red-500/10 border-red-500/20 text-red-500"
      }`} 
      title={connected ? "Supabase Online" : "Offline"}
    >
      {connected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
    </div>
  );
}
