/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA TEXT-TO-SPEECH (TTS) UNTUK NOTIFIKASI PESANAN MASUK.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN GAGALNYA NOTIFIKASI SUARA DI DAPUR/KASIR. ⚠️
 */

import { useRef, useEffect, useCallback } from "react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";
import type { Order } from "../types";

/**
 * useTTS — Text-to-Speech untuk notifikasi pesanan masuk.
 * Otomatis membacakan pesanan baru yang belum pernah diumumkan.
 */
export function useTTS(orders: Order[], enabled: boolean = true) {
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
    if (!("speechSynthesis" in window)) return;

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
      utterance.voice = idVoices[0]; // Fallback ke suara Indo pertama
    }

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
    
    // Ucapkan tiap bagian dengan jeda 1.5 detik
    parts.forEach((part, index) => {
      setTimeout(() => speak(part), index * 1500);
    });
  }, [speak]);

  // Detect pesanan baru ketika orders berubah
  useEffect(() => {
    if (orders.length === 0) return;

    if (isFirstLoad.current) {
      // Saat pertama load, tandai semua order yang sudah ada — jangan diumumkan
      orders.forEach(o => knownIds.current.add(o.id));
      isFirstLoad.current = false;
      return;
    }

    const newOrders = orders.filter(o => !knownIds.current.has(o.id));
    if (newOrders.length === 0) return;

    // Bersihkan antrian lama
    if (Capacitor.isNativePlatform()) {
      TextToSpeech.stop().catch(() => {});
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Tambahkan ke set agar tidak diumumkan dua kali
    newOrders.forEach(o => knownIds.current.add(o.id));

    // Umumkan dengan jeda antar pesanan jika lebih dari satu
    newOrders.forEach((order, index) => {
      setTimeout(() => announceOrder(order), index * 8000);
    });
  }, [orders, announceOrder]);

  return { speak };
}

/** Panggil sekali untuk preload daftar suara browser */
export function preloadVoices() {
  if (!Capacitor.isNativePlatform() && "speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}
