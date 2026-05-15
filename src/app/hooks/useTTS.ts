/**
 * ⚠️ DILARANG KERAS MENGUBAH ATAU MENGEDIT KODE INI TANPA IZIN ⚠️
 * File ini berisi logika Text-to-Speech (TTS) yang sangat sensitif untuk pesanan dapur dan bar.
 * Perubahan sembarangan pada jeda (setTimeout) dapat merusak sinkronisasi suara notifikasi!
 */
import { useRef, useEffect, useCallback } from "react";
import type { Order } from "../types";

/**
 * useTTS — Text-to-Speech untuk notifikasi pesanan masuk.
 * Otomatis membacakan pesanan baru yang belum pernah diumumkan.
 */
export function useTTS(orders: Order[], enabled: boolean = true) {
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const speak = useCallback((text: string) => {
    if (!enabled) return;
    if (!("speechSynthesis" in window)) return;

    // Cancel dihapus agar tidak memutus suara sebelumnya (Opsi 2)
    // window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
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
    if (!enabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [enabled]);

  const announceOrder = useCallback((order: Order) => {
    const items = order.items
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
    
    // Ucapkan tiap bagian dengan jeda 1.5 detik (Opsi 2)
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

    // Bersihkan antrian lama di browser HANYA SEKALI saat ada pesanan baru masuk
    window.speechSynthesis.cancel();

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
  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}