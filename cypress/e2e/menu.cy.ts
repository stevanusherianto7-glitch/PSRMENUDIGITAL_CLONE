describe('Kedai Elvera 57 - Guest Menu & Ordering E2E Flow (Cypress Mocked-API)', () => {
  beforeEach(() => {
    // Intercept Supabase fetch items call (return empty database to let GuestMenuPage fallback to using SEED_MENU)
    cy.intercept('GET', '**/rest/v1/menu_items?*', {
      statusCode: 200,
      body: []
    }).as('fetchMenuItems');

    // Intercept order creation call
    cy.intercept('POST', '**/rest/v1/orders*', {
      statusCode: 201,
      body: {
        id: 'CY-ORDER-12345',
        tableId: 'A9',
        items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 1 }],
        subtotal: 25000,
        total: 27500,
        notes: 'Masak pedas sedang ya chef, telurnya setengah matang.',
        orderMode: 'dine-in',
        status: 'pending',
        type: 'guest',
        created_at: new Date().toISOString()
      }
    }).as('createOrder');

    // Intercept fetching orders on status screen
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: [
        {
          id: 'CY-ORDER-12345',
          tableId: 'A9',
          items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 1 }],
          subtotal: 25000,
          total: 27500,
          notes: 'Masak pedas sedang ya chef, telurnya setengah matang.',
          orderMode: 'dine-in',
          status: 'pending',
          type: 'guest',
          created_at: new Date().toISOString()
        }
      ]
    }).as('fetchOrders');

    // Intercept PATCH/update order (used during cleanup/reset)
    cy.intercept('PATCH', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: { status: 'cancelled' }
    }).as('updateOrder');

    // Clear local storage and visit menu page
    cy.clearLocalStorage();
    cy.visit('/#/menu/A9');
  });

  it('should successfully place a Dine In order and follow the status tracking screen', () => {
    // --- 1. WELCOME MODAL STEP 1 ---
    cy.get('button', { timeout: 10000 }).contains('Masuk Ke Menu').should('be.visible').click();
    cy.contains('Selamat Datang di').should('be.visible');
    cy.contains('Meja A9').should('be.visible');
    cy.get('button').contains('Lanjut').click();

    // --- 2. WELCOME MODAL STEP 2 ---
    cy.contains('Cara Memesan').should('be.visible');
    cy.get('button').contains('Mulai Pesan Sekarang!').click();

    // Modal closes, main menu categories and items should render
    cy.contains('Selamat Datang di').should('not.exist');
    cy.get('button').contains('Makanan').should('be.visible');

    // --- 3. MENU ITEM SELECTION & DETAIL DIALOG ---
    // Click on "Nasi Goreng Jawa" card
    cy.contains('Nasi Goreng Jawa').click();

    // Verify detail dialog is rendered
    cy.get('h3').contains('Nasi Goreng Jawa').should('be.visible');
    cy.get('button').contains('Tambah').click();

    // Dialog closes and bottom checkout bar is shown
    cy.contains('Lihat Keranjang').should('exist');
    cy.contains('Rp 25.000').should('be.visible');

    // --- 4. CHECKOUT CART AND ADD CHEF NOTES ---
    cy.get('button').contains('Lihat Keranjang').click({ force: true });
    cy.contains('Keranjang Pesanan').should('be.visible');

    // Select Dine In (verify it is selected/active)
    cy.get('button').contains('Dine In').should('be.visible');

    // Fill notes for chef
    cy.get('textarea[placeholder*="masak pedas"]').type('Masak pedas sedang ya chef, telurnya setengah matang.');

    // Assert total price matches subtotal (25,000) + PPN 10% (2,500) = 27,500
    cy.contains('Rp 27.500').should('be.visible');

    // --- 5. SEND ORDER AND TRACK STATUS ---
    cy.get('button').contains('Pesan Sekarang').click();

    // Wait for Supabase createOrder mock intercept
    cy.wait('@createOrder');

    // Verify status tracking page is rendered
    cy.contains('Status Pesanan').should('be.visible');
    cy.contains('Menunggu Konfirmasi').should('be.visible');

    // Assert order number is visible in the status card
    cy.contains('CY-ORDER-12345').should('be.visible');

    // --- 6. RESET/CLEANUP ACTIVE ORDERS ---
    // Stub window.confirm to click "OK" automatically
    cy.on('window:confirm', (str) => {
      expect(str).to.include('Apakah Anda yakin ingin mereset');
      return true;
    });

    // Stub window.alert to capture the final message
    cy.on('window:alert', (str) => {
      expect(str).to.include('Pesanan aktif berhasil dibersihkan');
    });

    // Click trash/reset button in the header
    cy.get('header button').last().click();

    // Page should display "Semua pesanan telah selesai"
    cy.contains('Semua pesanan telah selesai').should('be.visible');
  });
});
