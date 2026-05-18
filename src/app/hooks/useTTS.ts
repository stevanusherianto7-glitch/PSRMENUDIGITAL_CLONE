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
import { toast } from "sonner";

/**
 * globalKnownIds — Set ID order yang sudah diketahui (pernah dilihat) oleh tab ini.
 * Disimpan di level modul agar persisten selama tab terbuka, kebal dari unmount/remount React.
 * 
 * PENTING: Set ini HANYA berisi ID order yang sudah ada saat halaman pertama kali di-load.
 * Order baru yang masuk SETELAH first load TIDAK boleh dimasukkan ke sini sampai setelah diumumkan.
 */
const globalKnownIds = new Set<string>();
let firstLoadDone = false; // Flag modul-level agar first load hanya terjadi SEKALI per tab

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
  const timeoutsRef = useRef<number[]>([]);

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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.95;  // Tempo tenang dan jelas untuk announcer dapur/kasir
    utterance.pitch = 1.15; // Pitch sedikit tinggi → kesan suara wanita natural
    utterance.volume = 1;

    // Pilih suara bahasa Indonesia — PRIORITAS: suara wanita (Gadis/Google)
    const voices = window.speechSynthesis.getVoices();
    const idVoices = voices.filter(
      v => v.lang === "id-ID" || v.lang.startsWith("id")
    );
    
    // 1. Utamakan suara wanita Indonesia (Gadis di Edge, Google di Chrome)
    const femaleVoice = idVoices.find(v => 
      v.name.includes("Gadis") || 
      v.name.includes("Google") || 
      v.name.toLowerCase().includes("female")
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (idVoices.length > 0) {
      // 2. Fallback: suara Indonesia lainnya (termasuk Andika jika hanya itu yang ada)
      utterance.voice = idVoices[0];
    }

    // Error handler: jika TTS gagal, play beep sebagai fallback
    utterance.onerror = (e) => {
      // Abaikan error jika sengaja di-cancel (karena ada notif antrian berikutnya)
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn("TTS utterance error, playing beep fallback", e);
      playNotifBeep();
    };

    toast("🔊 Memutar notifikasi suara...", { icon: '🤖', duration: 3000 });
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
    console.log("[TTS] Announcing order:", order.id, fullText);
    speak(fullText);
  }, [speak]);

  // Detect pesanan baru ketika orders berubah
  useEffect(() => {
    if (!isLoaded) return; // Tunggu sampai data awal selesai dimuat
    if (!enabled) return;  // Jangan proses jika TTS dimatikan

    // FIRST LOAD: Tandai semua order yang sudah ada — jangan diumumkan
    if (!firstLoadDone) {
      console.log("[TTS] First load - marking", orders.length, "existing orders as known");
      orders.forEach(o => globalKnownIds.add(o.id));
      firstLoadDone = true;
      return;
    }

    if (orders.length === 0) return;

    // Cari order baru yang BELUM ADA di globalKnownIds
    const newOrders = orders.filter(o => !globalKnownIds.has(o.id));

    if (newOrders.length === 0) return;

    console.log("[TTS] Detected", newOrders.length, "NEW orders:", newOrders.map(o => o.id));

    // Tandai semua order baru sebagai "diketahui" secara instan agar polling berikutnya tidak mengumumkan ulang
    newOrders.forEach(o => globalKnownIds.add(o.id));

    // Umumkan pesanan secara berurutan dengan jeda 8 detik antar pesanan
    newOrders.forEach((order, index) => {
      const announceTimeoutId = window.setTimeout(() => {
        announceOrder(order);
        // AUTO PRINT KITCHEN TICKET JIKA PRINTER TERHUBUNG
        if (printService.getIsConnected()) {
           printService.printKitchen(order).catch(e => console.error("Auto print failed:", e));
        }
      }, index * 8000);
      timeoutsRef.current.push(announceTimeoutId);
    });

    return () => {
      // Bersihkan semua timeout jika dependencies berubah atau unmount
      timeoutsRef.current.forEach(window.clearTimeout);
      timeoutsRef.current = [];
    };
  }, [orders, announceOrder, isLoaded, enabled]);

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
