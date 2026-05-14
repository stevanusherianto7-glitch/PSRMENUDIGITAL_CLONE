import { useState, useEffect } from "react";
import { Wifi, WifiOff, Clock, CheckCircle2, AlertTriangle, Info, Loader } from "lucide-react";

type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

interface RealTimeIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export default function RealTimeIndicator({ 
  className = "", 
  showDetails = false,
  compact = false 
}: RealTimeIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);

  // Simulasi monitoring koneksi
  useEffect(() => {
    const checkConnection = async () => {
      const startTime = Date.now();
      
      try {
        // Simulasi pengecekan koneksi ke Supabase/API
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
        
        const endTime = Date.now();
        setLatency(endTime - startTime);
        setStatus("connected");
        setLastUpdate(new Date());
        setRetryCount(0);
      } catch (error) {
        if (status !== "disconnected") {
          setStatus("disconnected");
          setRetryCount(prev => prev + 1);
        }
      }
    };

    const interval = setInterval(checkConnection, 5000);
    
    // Cek pertama kali
    checkConnection();

    return () => clearInterval(interval);
  }, [status]);

  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return {
          icon: Wifi,
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          text: "Terhubung",
          pulse: true
        };
      case "disconnected":
        return {
          icon: WifiOff,
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          text: "Terputus",
          pulse: false
        };
      case "connecting":
        return {
          icon: Loader,
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          text: "Menghubungkan",
          pulse: true
        };
      case "error":
        return {
          icon: AlertTriangle,
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/20",
          text: "Error",
          pulse: false
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const timeAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs ${config.color} ${className}`}>
        <Icon size={14} className={config.pulse ? "animate-pulse" : ""} />
        <span>{config.text}</span>
        {latency && <span>({latency}ms)</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-center gap-2">
        <Icon 
          size={16} 
          className={config.pulse ? "animate-pulse" : ""} 
        />
        <span className={`text-xs font-semibold ${config.color}`}>
          {config.text}
        </span>
      </div>
      
      {showDetails && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{timeAgo < 60 ? `${timeAgo}s` : `${Math.floor(timeAgo/60)}m`}</span>
          </div>
          
          {latency && (
            <span>{latency}ms</span>
          )}
          
          {retryCount > 0 && (
            <div className="flex items-center gap-1">
              <Info size={10} />
              <span>Retry {retryCount}</span>
            </div>
          )}
        </div>
      )}
      
      <div className={`w-2 h-2 rounded-full ${config.pulse ? "animate-pulse" : ""} ${
        status === "connected" ? "bg-green-400" :
        status === "connecting" ? "bg-yellow-400" :
        status === "error" ? "bg-orange-400" : "bg-red-400"
      }`} />
    </div>
  );
}