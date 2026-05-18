const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ugfpbkjuxrdgveyfbfks.supabase.co', 'sb_publishable_goaDeAnsgkAQ1ZQM_lArBQ_LhC6vN-7');

async function run() {
  const { data, error } = await supabase.from('orders').insert({
    id: 'ORD-NODE-1234',
    tableId: 'A4',
    status: 'pending',
    type: 'guest',
    items: [
      { id: 'menu_001', qty: 1, name: 'Test Food', price: 25000, category: 'Makanan' }
    ],
    subtotal: 25000,
    total: 25000,
    orderMode: 'dine-in'
  }).select();
  
  if(error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
