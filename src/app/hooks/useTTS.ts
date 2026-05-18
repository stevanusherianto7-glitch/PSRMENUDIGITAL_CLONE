/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA TEXT-TO-SPEECH (TTS) UNTUK NOTIFIKASI PESANAN MASUK.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN GAGALNYA NOTIFIKASI SUARA DI DAPUR/KASIR. ⚠️
 */

import { useRef, useEffect, useCallback } from "react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";
import type { Order } from "../types";
import { printService } from "../../utils/printService";

// Session ID unik untuk tab ini untuk koordinasi kunci antar-tab
const TAB_SESSION_ID = Math.random().toString(36).substring(2, 9);

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

/**
 * useTTS — Text-to-Speech untuk notifikasi pesanan masuk.
 * Otomatis membacakan pesanan baru yang belum pernah diumumkan.
 */
export function useTTS(orders: Order[], enabled: boolean = true, isLoaded: boolean = true) {
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const speak = useCallback(async (text: string) => {
    if (!enabled) return;

    // 1. Jalankan di Native (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await TextToSpeech.speak({
          text: text,
          lang: "id-ID",
          rate: 0.95,
          pitch: 1.15,
          volume: 1.0,
          category: "ambient",
        });
      } catch (e) {
        console.error("Native TTS error:", e);
      }
      return;
    }

    // 2. Fallback untuk Browser/Windows
    if (!("speechSynthesis" in window)) {
      // Terakhir: play beep jika tidak ada TTS sama sekali
      playNotifBeep();
      return;
    }

    // Jangan batalkan antrian agar pesan bisa diucapkan sampai selesai (antri)
    // window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.95;
    utterance.pitch = 1.15;
    utterance.volume = 1;

    // Pilih suara bahasa Indonesia jika tersedia
    const voices = window.speechSynthesis.getVoices();
    const idVoices = voices.filter(
      v => v.lang === "id-ID" || v.lang.startsWith("id")
    );
    
    // Prioritaskan suara wanita yang dikenal natural (Gadis di Edge, Google di Chrome)
    const femaleVoice = idVoices.find(v => 
      v.name.includes("Gadis") || 
      v.name.includes("Google") || 
      v.name.toLowerCase().includes("female")
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (idVoices.length > 0) {
      // Pastikan membuang suara Andika (pria) jika memungkinkan
      const anyOtherVoice = idVoices.find(v => !v.name.includes("Andika") && !v.name.toLowerCase().includes("male"));
      utterance.voice = anyOtherVoice || idVoices[0];
    }

    // Error handler: jika TTS gagal, play beep sebagai fallback
    utterance.onerror = (e) => {
      // Abaikan error jika sengaja di-cancel (karena ada notif antrian berikutnya)
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn("TTS utterance error, playing beep fallback", e);
      playNotifBeep();
    };

    window.speechSynthesis.speak(utterance);
  }, [enabled]);

  // Hentikan semua suara jika fitur dimatikan
  useEffect(() => {
    if (!enabled) {
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
    const mode = order.orderMode === "take-away" ? ", dibungkus" : ", makan di tempat";
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
      `Meja ${order.tableId}`,
      `${items}`,
      chefNote,
      `Mohon segera diproses.`
    ].filter(Boolean);
    
    const fullText = parts.join(". ");
    speak(fullText);
  }, [speak]);

  // Detect pesanan baru ketika orders berubah
  useEffect(() => {
    if (!isLoaded) return; // Tunggu sampai data awal selesai dimuat

    if (isFirstLoad.current) {
      // Saat pertama data masuk (setelah loaded), tandai semua order yang sudah ada — jangan diumumkan
      // PENTING: harus selalu set false, bahkan jika orders kosong
      orders.forEach(o => knownIds.current.add(o.id));
      isFirstLoad.current = false;
      return;
    }

    if (orders.length === 0) return;

    const newOrders = orders.filter(o => {
      if (knownIds.current.has(o.id)) return false;
      // CROSS-TAB CHECK: Mencegah tab ganda membacakan order yang sama
      const announced = localStorage.getItem(`tts_announced_${o.id}`);
      if (announced) {
        knownIds.current.add(o.id);
        return false;
      }
      return true;
    });

    if (newOrders.length === 0) return;

    // Kunci secara sinkron di level memori lokal tab ini agar tab ini tidak menschedule ulang
    newOrders.forEach(o => knownIds.current.add(o.id));

    // Bikin lock key unik untuk batch pesanan baru ini
    const batchId = newOrders.map(o => o.id).sort().join("_");
    const batchLockKey = `tts_batch_lock_${batchId}`;

    // Jitter delay acak (0-800ms) untuk memecah Race Condition antar-tab
    const jitter = Math.random() * 800;

    setTimeout(() => {
      // Cek apakah tab lain sudah memenangkan batch lock ini
      const activeLock = localStorage.getItem(batchLockKey);
      if (activeLock) {
        return; // Tab lain sudah memproses seluruh batch ini
      }

      // Tab ini yang menang, kunci seluruh batch!
      try {
        localStorage.setItem(batchLockKey, TAB_SESSION_ID);
      } catch (e) {
        console.warn("Gagal menulis batch lock ke localStorage:", e);
      }

      // Kunci masing-masing order di localStorage agar tab lain tidak memproses ulang
      newOrders.forEach(order => {
        try {
          localStorage.setItem(`tts_announced_${order.id}`, Date.now().toString());
        } catch (e) {
          console.warn("Gagal menulis tts_announced ke localStorage:", e);
        }
      });

      // Umumkan pesanan secara berurutan
      newOrders.forEach((order, index) => {
        setTimeout(() => {
          announceOrder(order);
          // AUTO PRINT KITCHEN TICKET JIKA PRINTER TERHUBUNG
          if (printService.getIsConnected()) {
             printService.printKitchen(order).catch(e => console.error("Auto print failed:", e));
          }
        }, index * 8000);
      });

      // Bersihkan batch lock dari localStorage setelah selesai diumumkan (setelah 10 menit)
      setTimeout(() => {
        try {
          localStorage.removeItem(batchLockKey);
        } catch (e) {
          console.warn("Gagal menghapus batch lock dari localStorage:", e);
        }
      }, 600000);

    }, jitter);
  }, [orders, announceOrder, isLoaded]);

  return { speak };
}

/** Panggil sekali untuk preload daftar suara browser */
export function preloadVoices() {
  if (!Capacitor.isNativePlatform() && "speechSynthesis" in window) {
    // Kosongkan antrian yang mungkin macet dari sesi sebelumnya
    window.speechSynthesis.cancel();
    
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

