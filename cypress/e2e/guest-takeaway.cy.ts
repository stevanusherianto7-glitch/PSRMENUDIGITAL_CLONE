describe('Kedai Elvera 57 - Guest Take-Away Order Flow (Cypress Mocked-API)', () => {
  beforeEach(() => {
    // Intercept Supabase fetch items call (return empty so GuestMenuPage falls back to SEED_MENU)
    cy.intercept('GET', '**/rest/v1/menu_items?*', {
      statusCode: 200,
      body: []
    }).as('fetchMenuItems');

    // Intercept order creation call for take-away
    cy.intercept('POST', '**/rest/v1/orders*', {
      statusCode: 201,
      body: {
        id: 'CY-TA-ORDER-001',
        tableId: 'A5',
        items: [
          { id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 1 },
          { id: 'menu_012', name: 'Jeruk Peras', price: 8000, qty: 1 }
        ],
        subtotal: 33000,
        total: 36300,
        notes: 'Bungkus rapi ya.',
        orderMode: 'take-away',
        status: 'pending',
        type: 'guest',
        created_at: new Date().toISOString()
      }
    }).as('createTakeAwayOrder');

    // Intercept fetching orders on status screen
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: [
        {
          id: 'CY-TA-ORDER-001',
          tableId: 'A5',
          items: [
            { id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 1 },
            { id: 'menu_012', name: 'Jeruk Peras', price: 8000, qty: 1 }
          ],
          subtotal: 33000,
          total: 36300,
          notes: 'Bungkus rapi ya.',
          orderMode: 'take-away',
          status: 'pending',
          type: 'guest',
          created_at: new Date().toISOString()
        }
      ]
    }).as('fetchOrders');

    // Intercept PATCH/update order
    cy.intercept('PATCH', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: { status: 'cancelled' }
    }).as('updateOrder');

    cy.clearLocalStorage();
    cy.visit('/#/menu/A5');
  });

  it('should place a Take Away order with multiple items and verify status tracking', () => {
    // --- 1. WELCOME MODAL ---
    cy.get('button', { timeout: 10000 }).contains('Masuk Ke Menu').should('be.visible').click();
    cy.contains('Selamat Datang di').should('be.visible');
    cy.contains('Meja A5').should('be.visible');
    cy.get('button').contains('Lanjut').click();

    // Welcome modal step 2
    cy.contains('Cara Memesan').should('be.visible');
    cy.get('button').contains('Mulai Pesan Sekarang!').click();
    cy.contains('Selamat Datang di').should('not.exist');

    // --- 2. ADD FIRST ITEM: Nasi Goreng Jawa (Makanan category - default) ---
    cy.get('button').contains('Makanan').should('be.visible');
    cy.contains('Nasi Goreng Jawa').click();
    cy.get('h3').contains('Nasi Goreng Jawa').should('be.visible');
    cy.get('button').contains('Tambah').click();

    // --- 3. SWITCH TO MINUMAN CATEGORY & ADD SECOND ITEM ---
    cy.get('button').contains('Minuman').click();
    cy.contains('Jeruk Peras').should('be.visible');
    cy.contains('Jeruk Peras').click();
    cy.get('h3').contains('Jeruk Peras').should('be.visible');
    cy.get('button').contains('Tambah').click();

    // --- 4. OPEN CART ---
    cy.get('button').contains('Lihat Keranjang').click();
    cy.contains('Keranjang Pesanan').should('be.visible');

    // Verify both items in cart
    cy.contains('Nasi Goreng Jawa').should('be.visible');
    cy.contains('Jeruk Peras').should('be.visible');

    // --- 5. SWITCH TO TAKE AWAY MODE ---
    cy.get('button').contains('Take Away').click();

    // --- 6. FILL NOTES ---
    cy.get('textarea[placeholder*="masak pedas"]').type('Bungkus rapi ya.');

    // --- 7. SUBMIT ORDER ---
    cy.get('button').contains('Pesan Sekarang').click();
    cy.wait('@createTakeAwayOrder');

    // --- 8. VERIFY STATUS TRACKING ---
    cy.contains('Status Pesanan').should('be.visible');
    cy.contains('CY-TA-ORDER-001').should('be.visible');
    cy.contains('Menunggu Konfirmasi').should('be.visible');
  });
});
