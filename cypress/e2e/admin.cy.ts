describe('Kedai Elvera 57 - Admin & POS Kasir E2E Operations (Cypress Mocked-API)', () => {
  const TABLE_ID = 'A7';

  beforeEach(() => {
    // Clear storage and start fresh
    cy.clearLocalStorage();
  });

  it('should successfully log in, navigate to POS Kasir, select an active served order, and process transaction to completion', () => {
    // 1. Inject Admin Session into LocalStorage to bypass login step and enter dashboard directly
    cy.window().then((win) => {
      win.localStorage.setItem('pawon_session', JSON.stringify({
        role: 'admin',
        name: 'Manager Kedai Elvera 57',
        username: 'admin'
      }));
    });

    // 2. Mock API endpoints for Supabase data loading in Admin Panel
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: [
        {
          id: 'MOCK-BILL-A7',
          table_id: TABLE_ID,
          items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 2, category: 'Makanan' }],
          subtotal: 50000,
          total: 55000,
          notes: 'Ekstra pedas ya chef!',
          order_mode: 'dine-in',
          status: 'served', // ready to be paid
          type: 'guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }).as('fetchOrders');

    cy.intercept('GET', '**/rest/v1/meja?*', {
      statusCode: 200,
      body: [
        { id: TABLE_ID, seat: 2, status: 'available' }
      ]
    }).as('fetchMeja');

    cy.intercept('GET', '**/rest/v1/menu_items?*', {
      statusCode: 200,
      body: [
        { id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, category: 'Makanan', available: true }
      ]
    }).as('fetchMenuItems');

    cy.intercept('GET', '**/rest/v1/inventory?*', {
      statusCode: 200,
      body: []
    }).as('fetchInventory');

    cy.intercept('GET', '**/rest/v1/inventory_logs?*', {
      statusCode: 200,
      body: []
    }).as('fetchInventoryLogs');

    cy.intercept('GET', '**/rest/v1/transactions?*', {
      statusCode: 200,
      body: []
    }).as('fetchTransactions');

    // 3. Mock CRUD API operations (Insert Transaction, Delete Order)
    cy.intercept('POST', '**/rest/v1/transactions*', {
      statusCode: 201,
      body: { success: true }
    }).as('postTransaction');

    cy.intercept('POST', '**/rest/v1/transaction_items*', {
      statusCode: 201,
      body: { success: true }
    }).as('postTransactionItems');

    cy.intercept('DELETE', '**/rest/v1/orders?id=eq.*', {
      statusCode: 200,
      body: []
    }).as('deleteOrder');

    // 4. Visit the Admin dashboard page
    cy.visit('/#/admin');

    // 5. Assert Admin Header branding and current tab
    cy.contains('Data Transaksi').should('be.visible');
    cy.contains('Admin Panel').should('be.visible');

    // 6. Action: Click sidebar navigation for KASIR (case-insensitive)
    cy.get('button').contains(/Kasir/i).click();

    // Verify cashier sub-dashboard loaded
    cy.contains('Antrean Pembayaran').should('be.visible');
    cy.contains(`Meja ${TABLE_ID}`).should('be.visible');

    // 7. Action: Click the bill card for Table A7
    cy.contains(`Meja ${TABLE_ID}`).click();

    // Assert items loaded inside checkout bill controller
    cy.contains('Pengelola Tagihan').should('be.visible');
    cy.contains('Nasi Goreng Jawa ×2').should('be.visible');
    cy.get('span').contains('Rp 55.000').should('be.visible');

    // 8. Action: Select payment method "TUNAI" (case-insensitive)
    cy.get('button').contains(/Tunai/i).click();

    // 9. Action: Click payment processor button
    cy.get('button').contains(/Proses Bayar/i).click();

    // Verify confirmation modal popup
    cy.contains('Konfirmasi Pembayaran').should('be.visible');
    cy.contains(/Ya, Proses/i).should('be.visible');

    // 10. Action: Confirm transaction inside modal
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: [] // Simulating that the order is no longer in queue after payment deleteOrder
    }).as('fetchOrdersAfterPayment');
    
    cy.get('button').contains(/Ya, Proses/i).click();

    // Assert API calls triggered correctly
    cy.wait('@postTransaction');
    cy.wait('@postTransactionItems');
    cy.wait('@deleteOrder');

    // Assert success screen
    cy.contains('Transaksi Berhasil').should('be.visible');
    cy.contains('Struk Pelanggan').should('be.visible');

    // 11. Action: Return to main cashier screen
    cy.get('button').contains(/Beranda Utama/i).click();

    // Reload to cleanly trigger loadOrders fetch under the new mocked empty state
    cy.reload();
    cy.get('button').contains(/Kasir/i).click();

    // The order card should be cleared from bills queue
    cy.contains(`Meja ${TABLE_ID}`).should('not.exist');
  });
});
