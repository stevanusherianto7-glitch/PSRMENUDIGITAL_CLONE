/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI TEMPLATE STRUK BELANJA DAN DAPUR UNTUK TAMPILAN LAYAR DAN PDF.
 * KESALAHAN MODIFIKASI DAPAT MERUSAK TATA LETAK STRUK SAAT DICETAK. ⚠️
 */

import React from "react";
import type { CartItem, Transaction, Order } from "../types";
import { rp } from "../data";

// CSS khusus untuk cetak struk 58mm
const receiptStyles = `
  @media screen {
    .receipt-container {
      display: none;
    }
  }
  @media print {
    /* Sembunyikan semua elemen di layar */
    body * {
      visibility: hidden;
      margin: 0;
      padding: 0;
    }
    /* Tampilkan hanya container struk */
    .receipt-container, .receipt-container * {
      visibility: visible;
    }
    .receipt-container {
      position: absolute;
      left: 0;
      top: 0;
      width: 58mm;
      padding: 4mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      line-height: 1.2;
      color: black;
      background: white;
    }
    .no-print {
      display: none !important;
    }
    @page {
      size: 58mm auto;
      margin: 0;
    }
  }
`;

interface KitchenReceiptProps {
  order: Order;
}

export function KitchenReceipt({ order }: KitchenReceiptProps) {
  const dapurItems = order.items.filter(item => (item.category || '').toLowerCase() !== 'minuman');
  const barItems = order.items.filter(item => (item.category || '').toLowerCase() === 'minuman');

  return (
    <div className="receipt-container">
      <style>{receiptStyles}</style>
      
      {/* DAPUR Section */}
      {dapurItems.length > 0 && (
        <div className="mb-4 last:mb-0">
          <div className="text-center font-bold border-b border-dashed pb-1 mb-1 text-sm">
            *** STRUK DAPUR ***
          </div>
          <div className="text-xs mb-1 space-y-0.5">
            <div>TIPE : {order.orderMode === "dine-in" ? "DINE-IN" : "TAKE-AWAY"}</div>
            <div>Meja : <span className="font-bold">{order.tableId || "Take Away"}</span></div>
            <div>Jam  : {new Date(order.created_at).toLocaleTimeString("id-ID")}</div>
            <div>Order: #{order.id.toUpperCase()}</div>
          </div>
          <div className="border-b border-dashed mb-1"></div>
          <div className="text-xs font-bold space-y-0.5">
            {dapurItems.map((item, i) => (
              <div key={i} className="py-0.5">
                {item.qty}x {item.name.toUpperCase()}
                {item.notes && <div className="pl-4 font-normal text-[10px] text-muted-foreground">(Catatan: {item.notes})</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BAR Section */}
      {barItems.length > 0 && (
        <div className="mb-4 last:mb-0">
          {dapurItems.length > 0 && <div className="border-b-2 border-double my-3"></div>}
          <div className="text-center font-bold border-b border-dashed pb-1 mb-1 text-sm">
            *** STRUK BAR ***
          </div>
          <div className="text-xs mb-1 space-y-0.5">
            <div>TIPE : {order.orderMode === "dine-in" ? "DINE-IN" : "TAKE-AWAY"}</div>
            <div>Meja : <span className="font-bold">{order.tableId || "Take Away"}</span></div>
            <div>Jam  : {new Date(order.created_at).toLocaleTimeString("id-ID")}</div>
            <div>Order: #{order.id.toUpperCase()}</div>
          </div>
          <div className="border-b border-dashed mb-1"></div>
          <div className="text-xs font-bold space-y-0.5">
            {barItems.map((item, i) => (
              <div key={i} className="py-0.5">
                {item.qty}x {item.name.toUpperCase()}
                {item.notes && <div className="pl-4 font-normal text-[10px] text-muted-foreground">(Catatan: {item.notes})</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {order.notes && (
        <div className="text-xs mt-2 border-t border-dashed pt-1">
          <span className="font-bold">Catatan Global:</span> {order.notes}
        </div>
      )}
    </div>
  );
}

interface GuestReceiptProps {
  tx: Transaction;
}

export function GuestReceipt({ tx }: GuestReceiptProps) {
  return (
    <div className="receipt-container">
      <style>{receiptStyles}</style>
      <div className="text-center font-bold text-sm mb-0.5">Kedai Elvera 57</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Ruko Beryl Commercial, Summarecon</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Jl. Bulevar Selatan No.78</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Cisaranten Kidul, Kec. Gedebage</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Kota Bandung, Jawa Barat 40295</div>
      <div className="text-center text-xs mb-1">WA: 0823-2033-6007</div>
      <div className="text-center text-xs mb-2 font-semibold">Order {tx.order_id ? tx.order_id : `#${tx.id}`}</div>
      
      <div className="border-b border-dashed mb-1"></div>
      
      <div className="text-xs mb-1">
        <div>Tgl: {new Date(tx.created_at).toLocaleDateString("id-ID")}</div>
        <div>Jam: {new Date(tx.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</div>
        <div>Bill: {tx.id.toUpperCase()}</div>
        {tx.order_id && <div>Order: {tx.order_id.toUpperCase()}</div>}
        <div>Kasir: Sansan</div>
      </div>
      
      <div className="border-b border-dashed mb-1"></div>
      
      {/* Table Headers */}
      <div className="text-xs font-bold flex justify-between mb-0.5">
        <span className="w-1/3">Transaksi</span>
        <span className="w-1/12 text-right">Qty</span>
        <span className="w-1/4 text-right">Harga</span>
        <span className="w-1/4 text-right">Total</span>
      </div>
      
      <div className="border-b border-dashed mb-1"></div>
      
      {/* Table Body */}
      <div className="text-xs py-2">
        {tx.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1">
            <span className="w-1/3 truncate">{item.name.toUpperCase()}</span>
            <span className="w-1/12 text-right">{item.qty}</span>
            <span className="w-1/4 text-right">{item.price.toLocaleString("id-ID")}</span>
            <span className="w-1/4 text-right">{(item.price * item.qty).toLocaleString("id-ID")}</span>
          </div>
        ))}
      </div>
      
      <div className="border-b border-dashed my-1"></div>
      
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{tx.subtotal.toLocaleString("id-ID")}</span>
        </div>
        {tx.discount_amount ? (
          <div className="flex justify-between">
            <span>
              Diskon ({tx.discount !== undefined && tx.discount !== null ? tx.discount : (tx.subtotal > 0 ? Math.round((tx.discount_amount || 0) / tx.subtotal * 100) : 0)}%):
            </span>
            <span>-{tx.discount_amount.toLocaleString("id-ID")}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-sm mt-1 border-t border-dashed pt-0.5">
          <span>TOTAL</span>
          <span>{tx.total.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between">
          <span>Metode Bayar:</span>
          <span>{tx.method.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar:</span>
          <span>{tx.total.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between">
          <span>Kembali:</span>
          <span>0</span>
        </div>
      </div>
      
      <div className="border-b border-dashed my-1"></div>
      
      <div className="text-[8pt] text-center mt-6 pt-3 pb-3 select-none text-muted-foreground leading-tight">
        Dukung UMKM Indonesia<br />
        Tulang Punggung Ekonomi Nasional
      </div>
    </div>
  );
}

interface ClosingReceiptProps {
  data: {
    bulan: string;
    kasir: string;
    startTime: string;
    endTime: string;
    terjual: number;
    items: { name: string; qty: number }[];
    totalVoid: number;
    pemasukan: {
      qris: number;
      debit: number;
      tunai: number;
      total: number;
    };
    kasKecil: {
      awal: number;
      saldo: number;
      total: number;
    };
  };
}

export function ClosingReceipt({ data }: ClosingReceiptProps) {
  return (
    <div className="receipt-container">
      <style>{receiptStyles}</style>
      <div className="text-center font-bold text-sm mb-0.5">Kedai Elvera 57</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Ruko Beryl Commercial, Summarecon</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Jl. Bulevar Selatan No.78</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Cisaranten Kidul, Kec. Gedebage</div>
      <div className="text-center text-[7.5px] leading-tight mb-0.5">Kota Bandung, Jawa Barat 40295</div>
      <div className="text-center text-xs mb-2">WA: 0823-2033-6007</div>
      
      <div className="border-b border-dashed mb-1"></div>
      
      <div className="text-center font-bold text-xs my-2 tracking-widest">
        LAPORAN REKAPITULASI
      </div>
      
      <div className="text-xs mb-1">
        <div className="flex justify-between"><span>Bulan:</span> <span>{data.bulan}</span></div>
        <div className="flex justify-between"><span>Kasir:</span> <span>{data.kasir}</span></div>
        <div className="flex justify-between"><span>Mulai:</span> <span>{data.startTime}</span></div>
        <div className="flex justify-between"><span>Selesai:</span> <span>{data.endTime}</span></div>
        <div className="flex justify-between font-bold"><span>Terjual:</span> <span>{data.terjual} Item</span></div>
      </div>
      
      <div className="border-b border-dashed my-1"></div>
      
      <div className="text-xs font-bold mt-3 mb-1">DETAIL TRANSAKSI</div>
      <div className="text-xs space-y-1 py-2">
        {data.items && data.items.length > 0 ? (
          data.items.map((item, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="truncate w-3/4">{item.name.toUpperCase()}</span>
              <span className="font-medium">x {item.qty}</span>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground text-[10px] py-2 italic">Tidak ada transaksi</div>
        )}
      </div>
      
      <div className="border-b border-dashed my-2"></div>
      
      <div className="text-xs font-bold my-1">TRANSAKSI VOID</div>
      <div className="text-xs flex justify-between">
        <span>TOTAL VOID</span>
        <span>{data.totalVoid}</span>
      </div>
      
      <div className="border-b border-dashed my-2"></div>
      
      <div className="text-xs font-bold my-1">DETAIL PEMASUKAN</div>
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>QRIS</span>
          <span>Rp {data.pemasukan.qris.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between">
          <span>DEBIT CARD</span>
          <span>Rp {data.pemasukan.debit.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between">
          <span>TUNAI</span>
          <span>Rp {data.pemasukan.tunai.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-dashed pt-0.5 mt-0.5">
          <span>TOTAL PEMASUKAN</span>
          <span>Rp {data.pemasukan.total.toLocaleString("id-ID")}</span>
        </div>
      </div>
      
      <div className="border-b border-dashed my-2"></div>
      
      <div className="text-xs font-bold my-1">DETAIL KAS KECIL</div>
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>KAS AWAL</span>
          <span>Rp {data.kasKecil.awal.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between">
          <span>SALDO</span>
          <span>Rp {data.kasKecil.saldo.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-dashed pt-0.5 mt-0.5">
          <span>TOTAL KAS</span>
          <span>Rp {data.kasKecil.total.toLocaleString("id-ID")}</span>
        </div>
      </div>
      
      <div className="text-center text-[7pt] mt-8 border-t border-dashed pt-5 pb-4 space-y-1 select-none text-muted-foreground leading-tight">
        <div>Diterbitkan Oleh:</div>
        <div className="font-bold text-[8pt] text-foreground">POSGO - Self Order & POS App</div>
        <div>POSGO-hub.com</div>
      </div>
    </div>
  );
}
