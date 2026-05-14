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
  return (
    <div className="receipt-container">
      <style>{receiptStyles}</style>
      <div className="text-center font-bold border-b border-dashed pb-1 mb-1 text-sm">
        DAAPUR (KITCHEN)
      </div>
      <div className="text-xs mb-1">
        <div>Waktu: {new Date(order.created_at).toLocaleTimeString("id-ID")}</div>
        <div>Meja: <span className="font-bold text-sm">{order.tableId}</span></div>
        <div>No: {order.id.slice(-5).toUpperCase()}</div>
        <div>Tipe: {order.orderMode === "dine-in" ? "Dine In" : "Take Away"}</div>
      </div>
      <div className="border-b border-dashed mb-1"></div>
      <div className="text-xs font-bold">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-0.5">
            <span>{item.name}</span>
            <span>x{item.qty}</span>
          </div>
        ))}
      </div>
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
      <div className="text-center font-bold text-sm mb-0.5">KEDAI ELVERA 57</div>
      <div className="text-center text-xs mb-1">Resto & Cafe</div>
      <div className="text-xs mb-1">
        <div>Tgl: {new Date(tx.created_at).toLocaleDateString("id-ID")}</div>
        <div>Jam: {new Date(tx.created_at).toLocaleTimeString("id-ID")}</div>
        <div>Meja: {tx.table_id || "Walk-in"}</div>
        <div>Kasir: Admin</div>
        <div>ID: {tx.id.toUpperCase()}</div>
      </div>
      <div className="border-b border-dashed mb-1"></div>
      <div className="text-xs">
        {tx.items.map((item, i) => (
          <div key={i} className="mb-1">
            <div>{item.name}</div>
            <div className="flex justify-between">
              <span>{item.qty} x {rp(item.price)}</span>
              <span>{rp(item.price * item.qty)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-b border-dashed my-1"></div>
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{rp(tx.subtotal)}</span>
        </div>
        {tx.discount_amount ? (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{rp(tx.discount_amount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>PB1 (10%)</span>
          <span>{rp(tx.tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm mt-1 border-t border-dashed pt-0.5">
          <span>TOTAL</span>
          <span>{rp(tx.total)}</span>
        </div>
      </div>
      <div className="border-b border-dashed my-1"></div>
      <div className="text-xs text-center font-bold py-0.5 border border-black my-1">
        Bayar: {tx.method.toUpperCase()}
      </div>
      <div className="text-[8pt] text-center mt-3">
        Terima Kasih<br />Silahkan Berkunjung Kembali
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
