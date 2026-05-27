import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Hook untuk cek status Supabase dengan efek neon
export const useSupabaseStatus = () => {
  const [status, setStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    const checkStatus = async () => {
      setStatus('loading');
      try {
        // Cek koneksi ke Supabase dengan endpoint yang lebih ringan
        const { data, error } = await supabase.from('meja').select('id').limit(1);
        if (error) throw error;
        setStatus('online');
      } catch (error) {
        setStatus('offline');
      }
      setLastCheck(new Date());
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Cek setiap 30 detik

    return () => clearInterval(interval);
  }, []);

  return { status, lastCheck };
};
