const http = require('https');
http.get('https://psrmenudigital-clone.vercel.app/', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!match) return console.log('No JS bundle found');
    
    http.get('https://psrmenudigital-clone.vercel.app' + match[1], (jsRes) => {
      let js = '';
      jsRes.on('data', d => js += d);
      jsRes.on('end', () => {
        console.log("Edge Function URL:", js.includes("functions/v1/make-server"));
        console.log("Elvera ID:", js.includes("ugfpbkjuxrdgveyfbfks"));
        console.log("Pawon ID:", js.includes("pbitlwrgainrcippjuwd"));
        console.log("fetchOrders uses supabase.from('orders'):", js.includes('.from("orders")'));
      });
    });
  });
});
