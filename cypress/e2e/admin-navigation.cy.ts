describe('Kedai Elvera 57 - Admin Navigation & Module Switching (Cypress Mocked-API)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();

    // Inject Admin Session
    cy.window().then((win) => {
      win.localStorage.setItem('pawon_session', JSON.stringify({
        role: 'admin',
        name: 'Admin Kedai Elvera 57',
        username: 'admin'
      }));
    });

    // Mock all API endpoints with empty data
    cy.intercept('GET', '**/rest/v1/orders?*', { statusCode: 200, body: [] }).as('fetchOrders');
    cy.intercept('GET', '**/rest/v1/meja?*', {
      statusCode: 200,
      body: [
        { id: 'A1', seat: 4, status: 'available' },
        { id: 'A2', seat: 2, status: 'occupied' },
        { id: 'A3', seat: 6, status: 'reserved' },
      ]
    }).as('fetchMeja');
    cy.intercept('GET', '**/rest/v1/menu_items?*', {
      statusCode: 200,
      body: [
        { id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, category: 'Makanan', available: true },
        { id: 'menu_002', name: 'Es Teh Manis', price: 8000, category: 'Minuman', available: true },
      ]
    }).as('fetchMenuItems');
    cy.intercept('GET', '**/rest/v1/inventory?*', { statusCode: 200, body: [] }).as('fetchInventory');
    cy.intercept('GET', '**/rest/v1/inventory_logs?*', { statusCode: 200, body: [] }).as('fetchInventoryLogs');
    cy.intercept('GET', '**/rest/v1/transactions?*', { statusCode: 200, body: [] }).as('fetchTransactions');
  });

  it('should render Admin Panel header with correct branding and navigate sidebar modules', () => {
    cy.visit('/#/admin');

    // Assert Admin Panel header and branding
    cy.contains('Admin Panel').should('be.visible');
    cy.contains('Data Transaksi').should('be.visible');

    // Navigate to Manajemen Meja
    cy.get('button').contains('Manajemen Meja').click();
    cy.contains('Kosong').should('be.visible');

    // Navigate to Katalog Menu
    cy.get('button').contains('Katalog Menu').click();
    cy.contains('Nasi Goreng Jawa').should('be.visible');

    // Navigate to Monitor Pesanan
    cy.get('button').contains('Monitor Pesanan').click();
    cy.contains('Tidak ada pesanan').should('be.visible');

    // Navigate to Kasir
    cy.get('button').contains(/^Kasir$/i).click();
    cy.contains('Antrean Pembayaran').should('be.visible');
  });

  it('should display Manajemen Meja module with table cards and status summary', () => {
    cy.visit('/#/admin');

    // Navigate to Meja module
    cy.get('button').contains('Manajemen Meja').click();

    // Verify status summary cards (4 status categories)
    cy.contains('Kosong').should('be.visible');
    cy.contains('Terisi').should('be.visible');
    cy.contains('Reservasi').should('be.visible');

    // Verify individual table cards
    cy.contains('A1').should('be.visible');
    cy.contains('A2').should('be.visible');
    cy.contains('A3').should('be.visible');

    // Click a table card to view details
    cy.contains('A2').click();
    cy.contains('Meja A2').should('be.visible');
  });

  it('should display Katalog Menu module with items and category filter', () => {
    cy.visit('/#/admin');

    // Navigate to Katalog Menu
    cy.get('button').contains('Katalog Menu').click();

    // Verify menu items are rendered
    cy.contains('Nasi Goreng Jawa').should('be.visible');
    cy.contains('Es Teh Manis').should('be.visible');
  });
});
