const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ugfpbkjuxrdgveyfbfks.supabase.co', 'sb_publishable_goaDeAnsgkAQ1ZQM_lArBQ_LhC6vN-7');

async function run() {
  console.log("Testing insert with camelCase...");
  const order = {
    id: 'ORD-TEST-1234',
    tableId: 'A1',
    items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 1, category: 'Makanan' }],
    subtotal: 25000,
    total: 25000,
    notes: '',
    orderMode: 'dine-in',
    status: 'pending',
    type: 'guest'
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();

  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Success:", data);
  }
}
run();
