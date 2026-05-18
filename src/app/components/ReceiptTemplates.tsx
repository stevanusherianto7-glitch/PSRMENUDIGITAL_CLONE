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
        <>
          <div className="text-center font-bold border-b border-dashed pb-1 mb-1 text-sm">
            DAPUR (KITCHEN)
          </div>
          <div className="text-xs mb-1">
            <div>Waktu: {new Date(order.created_at).toLocaleTimeString("id-ID")}</div>
            <div>Meja: <span className="font-bold text-sm">{order.tableId}</span></div>
            <div>No: {order.id.slice(-5).toUpperCase()}</div>
            <div>Tipe: {order.orderMode === "dine-in" ? "Dine In" : "Take Away"}</div>
          </div>
          <div className="border-b border-dashed mb-1"></div>
          <div className="text-xs font-bold">
            {dapurItems.map((item, i) => (
              <div key={i} className="flex justify-between py-0.5">
                <span>{item.name}</span>
                <span>x{item.qty}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* BAR Section */}
      {barItems.length > 0 && (
        <>
          {dapurItems.length > 0 && <div className="border-b-2 border-double my-2"></div>}
          <div className="text-center font-bold border-b border-dashed pb-1 mb-1 text-sm">
            BAR (MINUMAN)
          </div>
          {dapurItems.length === 0 && (
            <div className="text-xs mb-1">
              <div>Waktu: {new Date(order.created_at).toLocaleTimeString("id-ID")}</div>
              <div>Meja: <span className="font-bold text-sm">{order.tableId}</span></div>
              <div>No: {order.id.slice(-5).toUpperCase()}</div>
              <div>Tipe: {order.orderMode === "dine-in" ? "Dine In" : "Take Away"}</div>
            </div>
          )}
          <div className="border-b border-dashed mb-1"></div>
          <div className="text-xs font-bold">
            {barItems.map((item, i) => (
              <div key={i} className="flex justify-between py-0.5">
                <span>{item.name}</span>
                <span>x{item.qty}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="border-b border-dashed my-1"></div>
      {order.notes && (
        <div className="text-xs">
          <span className="font-bold">Catatan:</span> {order.notes}
        </div>
      )}
      <div className="text-center text-[8pt] mt-3 border-t border-dashed pt-1">
        Kedai Elvera 57 POS
      </div>
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
      <div className="text-center text-xs mb-0.5">Jl. Pertanian No. 57</div>
      <div className="text-center text-xs mb-0.5">Lebak Bulus, Jakarta Selatan</div>
      <div className="text-center text-xs mb-1">WA: 0895-3763-48626</div>
      <div className="text-center text-xs mb-2 font-semibold">Order #{tx.id}</div>
      
      <div className="border-b border-dashed mb-1"></div>
      
      <div className="text-xs mb-1">
        <div>Tgl: {new Date(tx.created_at).toLocaleDateString("id-ID")}</div>
        <div>Jam: {new Date(tx.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</div>
        <div>Bill: {tx.id.toUpperCase()}</div>
        <div>Kasir: Verena</div>
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
      <div className="text-xs">
        {tx.items.map((item, i) => (
          <div key={i} className="flex justify-between mb-0.5">
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
      
      <div className="text-[8pt] text-center mt-2">
        Dukung UMKM Indonesia<br />
        Tulang Punggung Ekonomi Nasional
      </div>
    </div>
  );
}

interface ClosingReceiptProps {
  data: {
    date: string;
    penjualanBersih: number;
    hpp: number;
    labaKotor: number;
    qris: number;
    tunai: number;
    kartu: number;
    totalTransaksi: number;
    totalItem: number;
    pb1: number;
  };
}

export function ClosingReceipt({ data }: ClosingReceiptProps) {
  return (
    <div className="receipt-container">
      <style>{receiptStyles}</style>
      <div className="text-center font-bold border-b border-dashed pb-1 mb-1 text-sm">
        LAPORAN CLOSING
      </div>
      <div className="text-xs mb-1">
        <div>Tanggal: {data.date}</div>
        <div>Waktu: {new Date().toLocaleTimeString("id-ID")}</div>
        <div>Staff: Admin</div>
      </div>
      <div className="border-b border-dashed mb-1"></div>
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>Penjualan Bersih</span>
          <span>{rp(data.penjualanBersih)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>HPP</span>
          <span>{rp(data.hpp)}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-dashed pt-0.5">
          <span>Laba Kotor</span>
          <span>{rp(data.labaKotor)}</span>
        </div>
        <div className="flex justify-between">
          <span>PB1</span>
          <span>{rp(data.pb1)}</span>
        </div>
      </div>
      <div className="border-b border-dashed my-1"></div>
      <div className="text-xs space-y-0.5">
        <div className="font-bold mb-0.5">Metode Pembayaran:</div>
        <div className="flex justify-between">
          <span>QRIS</span>
          <span>{rp(data.qris)}</span>
        </div>
        <div className="flex justify-between">
          <span>TUNAI</span>
          <span>{rp(data.tunai)}</span>
        </div>
        <div className="flex justify-between">
          <span>KARTU</span>
          <span>{rp(data.kartu)}</span>
        </div>
      </div>
      <div className="border-b border-dashed my-1"></div>
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>Total Transaksi</span>
          <span>{data.totalTransaksi}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Item Terjual</span>
          <span>{data.totalItem}</span>
        </div>
      </div>
      <div className="text-center text-[8pt] mt-3 border-t border-dashed pt-1">
        End of Shift Report
      </div>
    </div>
  );
}
