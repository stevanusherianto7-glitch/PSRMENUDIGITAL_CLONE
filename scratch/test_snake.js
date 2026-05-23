const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pbitlwrgainrcippjuwd.supabase.co', 'sb_publishable_4fJEkMwBlAmMjBez-6KgXA_eAXRMdsJ');

async function run() {
  // Let's first query the orders table to see if it responds!
  console.log("Mencoba membaca dari tabel 'orders'...");
  const { data: readData, error: readError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (readError) {
    console.error("Gagal membaca:", readError);
  } else {
    console.log("Berhasil membaca! Jumlah baris contoh:", readData.length);
    console.log("Struktur kolom yang ada:", readData[0] ? Object.keys(readData[0]) : "Tabel kosong");
  }

  // Let's try inserting with snake_case
  console.log("\nMencoba melakukan insert dengan snake_case...");
  const { data: insertData, error: insertError } = await supabase.from('orders').insert({
    id: 'ORD-TEST-SNAKE',
    table_id: 'A4',
    status: 'pending',
    type: 'guest',
    items: [
      { id: 'menu_001', qty: 1, name: 'Test Food', price: 25000, category: 'Makanan' }
    ],
    subtotal: 25000,
    total: 25000,
    order_mode: 'dine-in'
  }).select();

  if (insertError) {
    console.error("Gagal insert:", insertError);
  } else {
    console.log("Berhasil insert! Data yang disimpan:", JSON.stringify(insertData, null, 2));
    
    // Hapus data uji coba agar database bersih kembali
    console.log("\nMembersihkan data uji coba...");
    const { error: deleteError } = await supabase.from('orders').delete().eq('id', 'ORD-TEST-SNAKE');
    if (deleteError) {
      console.error("Gagal membersihkan:", deleteError);
    } else {
      console.log("Berhasil membersihkan data uji coba!");
    }
  }
}
run();
