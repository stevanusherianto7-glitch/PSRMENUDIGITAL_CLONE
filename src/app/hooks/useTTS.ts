/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA TEXT-TO-SPEECH (TTS) UNTUK NOTIFIKASI PESANAN MASUK.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN GAGALNYA NOTIFIKASI SUARA DI DAPUR/KASIR. ⚠️
 */

import { useEffect, useCallback } from "react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";
import type { Order } from "../types";
import { printService } from "../../utils/printService";
import { toast } from "sonner";

/**
 * globalKnownIds — Set ID order yang sudah diketahui (pernah dilihat) oleh tab ini.
 * Disimpan di level modul agar persisten selama tab terbuka.
 */
const globalKnownIds = new Set<string>();
const scheduledIds = new Set<string>();
let firstLoadDone = false; // Flag modul-level agar first load hanya terjadi SEKALI per tab

interface QueueItem {
  text: string;
  enabled: boolean;
}

// Antrean TTS tingkat modul untuk menjamin pengumuman sekuensial tanpa kehilangan state
const ttsQueue: QueueItem[] = [];
let isProcessingQueue = false;

/**
 * playNotifBeep — Notifikasi suara beep menggunakan Web Audio API.
 * Digunakan sebagai fallback jika TTS gagal atau tidak tersedia.
 */
function playNotifBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880; // Note A5
    gain.gain.value = 0.3;
    osc.start();
    // Dua beep pendek
    setTimeout(() => { gain.gain.value = 0; }, 150);
    setTimeout(() => { gain.gain.value = 0.3; }, 250);
    setTimeout(() => { gain.gain.value = 0; osc.stop(); ctx.close(); }, 400);
  } catch (_) { /* ignore */ }
}

async function executeSpeakNative(text: string): Promise<void> {
  const rate = parseFloat(localStorage.getItem("pawon_tts_rate") || "0.95");
  const pitch = parseFloat(localStorage.getItem("pawon_tts_pitch") || "1.15");
  try {
    await TextToSpeech.speak({
      text: text,
      lang: "id-ID",
      rate,
      pitch,
      volume: 1.0,
      category: "ambient",
    });
  } catch (e) {
    console.error("Native TTS error:", e);
  }
}

function executeSpeakWeb(text: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      playNotifBeep();
      resolve();
      return;
    }

    const rate = parseFloat(localStorage.getItem("pawon_tts_rate") || "0.95");
    const pitch = parseFloat(localStorage.getItem("pawon_tts_pitch") || "1.15");
    const preferredVoiceName = localStorage.getItem("pawon_tts_voice_name") || "";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = rate;  // Tempo tenang dan jelas
    utterance.pitch = pitch; // Pitch sedikit tinggi → suara wanita natural
    utterance.volume = 1;

    // Pilih suara bahasa Indonesia
    const voices = window.speechSynthesis.getVoices();
    
    let selectedVoice = preferredVoiceName 
      ? voices.find(v => v.name === preferredVoiceName)
      : null;

    if (!selectedVoice) {
      const idVoices = voices.filter(
        v => v.lang === "id-ID" || v.lang.startsWith("id")
      );
      
      selectedVoice = idVoices.find(v => 
        v.name.includes("Gadis") || 
        v.name.includes("Google") || 
        v.name.toLowerCase().includes("female")
      ) || idVoices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    let isResolved = false;
    const finish = () => {
      if (isResolved) return;
      isResolved = true;
      resolve();
    };

    utterance.onend = () => {
      finish();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn("TTS utterance error, playing beep fallback", e);
        playNotifBeep();
      }
      finish();
    };

    // Safety net: jika web speech API macet (bug Chrome), paksa lanjut setelah 25 detik
    const safetyTimer = setTimeout(() => {
      console.warn("TTS safety net triggered (speech took too long or stuck)");
      finish();
    }, 25000);

    window.speechSynthesis.speak(utterance);

    // Overwrite callback untuk membersihkan safety timer
    const origOnEnd = utterance.onend;
    utterance.onend = (ev) => {
      clearTimeout(safetyTimer);
      origOnEnd?.call(utterance, ev);
    };

    const origOnError = utterance.onerror;
    utterance.onerror = (ev) => {
      clearTimeout(safetyTimer);
      origOnError?.call(utterance, ev);
    };
  });
}

async function startQueueProcessor() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (ttsQueue.length > 0) {
    const item = ttsQueue.shift();
    if (!item) continue;

    if (!item.enabled) {
      // Kosongkan antrean jika TTS dinonaktifkan
      ttsQueue.length = 0;
      break;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await executeSpeakNative(item.text);
      } else {
        await executeSpeakWeb(item.text);
      }
    } catch (err) {
      console.error("[TTS Queue] Speak error:", err);
    }

    // Jeda 2 detik setelah pengumuman selesai sebelum memulai pengumuman berikutnya
    await new Promise(res => setTimeout(res, 2000));
  }

  isProcessingQueue = false;
}

/**
 * useTTS — Text-to-Speech untuk notifikasi pesanan masuk.
 * Otomatis membacakan pesanan baru yang belum pernah diumumkan.
 */
export function useTTS(orders: Order[], enabled: boolean = true, isLoaded: boolean = true) {
  const speak = useCallback((text: string) => {
    if (!enabled) return;
    toast("🔊 Notifikasi suara masuk antrean...", { icon: '🤖', duration: 2500 });
    ttsQueue.push({ text, enabled });
    startQueueProcessor();
  }, [enabled]);

  // Bersihkan antrean jika dimatikan
  useEffect(() => {
    if (!enabled) {
      ttsQueue.length = 0;
      if (Capacitor.isNativePlatform()) {
        TextToSpeech.stop().catch(() => {});
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [enabled]);

  const announceOrder = useCallback((order: Order) => {
    const drinkItems = order.items.filter(i => i.category === "Minuman");
    const foodItems = order.items.filter(i => i.category === "Makanan" || i.category === "Snack");
    const otherItems = order.items.filter(i => i.category !== "Minuman" && i.category !== "Makanan" && i.category !== "Snack");
    
    const sortedItems = [...drinkItems, ...foodItems, ...otherItems];

    const items = sortedItems
      .map(i => `${i.name} ${i.qty === 1 ? "satu" : i.qty === 2 ? "dua" : i.qty === 3 ? "tiga" : i.qty === 4 ? "empat" : i.qty === 5 ? "lima" : String(i.qty)}`)
      .join(", ");
    const source = order.type === "guest" ? "dari tamu" : order.type === "waiter" ? "dari pelayan" : "dari kasir";
    const tableId = order.tableId || order.table_id || "?";
    const mode = order.orderMode === "take-away" || order.order_mode === "take-away" ? ", dibungkus" : ", makan di tempat";
    const chefNote = order.notes ? `Catatan untuk shef: ${order.notes}` : "";
    
    const hasFood = order.items.some(i => i.category === "Makanan" || i.category === "Snack");
    const hasDrinks = order.items.some(i => i.category === "Minuman");

    let targetText = "Pesanan baru masuk";
    if (hasFood && hasDrinks) {
      targetText = "Pesanan untuk dapur dan bar baru masuk";
    } else if (hasFood) {
      targetText = "Pesanan untuk dapur baru masuk";
    } else if (hasDrinks) {
      targetText = "Pesanan untuk bar baru masuk";
    }

    const parts = [
      `${targetText}, ${source} ${mode}`,
      `Meja ${tableId}`,
      `${items}`,
      chefNote,
      `Mohon segera diproses.`
    ].filter(Boolean);
    
    const fullText = parts.join(". ");
    console.log("[TTS] Queueing order announcement:", order.id, fullText);
    speak(fullText);
  }, [speak]);

  // Detect pesanan baru ketika orders berubah
  useEffect(() => {
    if (!isLoaded) return;
    if (!enabled) return;

    // FIRST LOAD: Tandai semua order yang sudah ada
    if (!firstLoadDone) {
      console.log("[TTS] First load - marking", orders.length, "existing orders as known");
      orders.forEach(o => globalKnownIds.add(o.id));
      firstLoadDone = true;
      return;
    }

    if (orders.length === 0) return;

    // Cari kandidat order baru (yang belum pernah diumumkan di tab ini dan belum dijadwalkan)
    const candidates = orders.filter(o => !globalKnownIds.has(o.id) && !scheduledIds.has(o.id));
    if (candidates.length === 0) return;

    // Tandai sebagai dijadwalkan agar tidak dijadwalkan ulang oleh pemicu useEffect berikutnya
    candidates.forEach(o => scheduledIds.add(o.id));

    // Tambahkan delay acak (100 - 300ms) untuk mencegah tab melakukan pengecekan/klaim secara bersamaan
    const randomDelay = Math.floor(Math.random() * 200) + 100;

    const timeoutId = setTimeout(() => {
      const now = Date.now();
      const newOrdersToAnnounce: Order[] = [];

      candidates.forEach(o => {
        // Hapus dari status dijadwalkan karena timeout sedang dieksekusi
        scheduledIds.delete(o.id);
        
        // Cek kembali memori dan localStorage setelah delay acak
        if (globalKnownIds.has(o.id)) return;

        try {
          const lockData = localStorage.getItem(`tts_lock_${o.id}`);
          if (lockData) {
            const lockTime = parseInt(lockData, 10);
            if (now - lockTime < 30000) {
              // Sudah di-lock oleh tab lain
              globalKnownIds.add(o.id);
              return;
            }
          }
        } catch (_) { /* ignore */ }

        // Jika lolos pengecekan, klaim order ini
        globalKnownIds.add(o.id);
        try {
          localStorage.setItem(`tts_lock_${o.id}`, String(now));
        } catch (_) { /* ignore */ }

        newOrdersToAnnounce.push(o);
      });

      if (newOrdersToAnnounce.length === 0) return;

      console.log("[TTS] Claimed new orders after back-off delay:", newOrdersToAnnounce.map(o => o.id));

      newOrdersToAnnounce.forEach(order => {
        announceOrder(order);
        // AUTO PRINT KITCHEN TICKET JIKA PRINTER TERHUBUNG
        if (printService.getIsConnected()) {
           printService.printKitchen(order).catch(e => console.error("Auto print failed:", e));
        }
      });

      // Bersihkan lock keys setelah 60 detik
      setTimeout(() => {
        newOrdersToAnnounce.forEach(o => {
          try { 
            localStorage.removeItem(`tts_lock_${o.id}`); 
          } catch (_) { /* ignore */ }
        });
      }, 60000);

    }, randomDelay);

    return () => {
      clearTimeout(timeoutId);
      // Jika di-cleanup sebelum timeout berjalan, hapus dari scheduledIds agar bisa dijadwalkan ulang
      candidates.forEach(o => scheduledIds.delete(o.id));
    };
  }, [orders, announceOrder, isLoaded, enabled]);

  return { speak };
}

/** Panggil sekali untuk preload daftar suara browser */
export function preloadVoices() {
  if (!Capacitor.isNativePlatform() && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}
