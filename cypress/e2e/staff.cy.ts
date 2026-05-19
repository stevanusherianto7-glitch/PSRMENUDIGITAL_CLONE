describe('Kedai Elvera 57 - Staff & POS Operations E2E Flow (Cypress Mocked-API)', () => {
  const TABLE_ID = 'A8';

  beforeEach(() => {
    // Clear storage and start with a fresh slate
    cy.clearLocalStorage();
  });

  it('should successfully handle order lifecycle as Kitchen Staff (Dapur)', () => {
    // 1. Inject Kitchen Session into LocalStorage
    cy.window().then((win) => {
      win.localStorage.setItem('pawon_session', JSON.stringify({
        role: 'kitchen',
        name: 'Chief Chef Dapur',
        username: 'kitchen'
      }));
    });

    // 2. Mock pending order for Kitchen (Makanan category)
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: [
        {
          id: 'MOCK-ORDER-999',
          tableId: TABLE_ID,
          items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 2, category: 'Makanan' }],
          subtotal: 50000,
          total: 55000,
          notes: 'Ekstra pedas ya chef!',
          orderMode: 'dine-in',
          status: 'pending',
          type: 'guest',
          created_at: new Date().toISOString()
        }
      ]
    }).as('fetchPendingOrders');

    // 3. Mock PATCH call to update order status dynamically
    cy.intercept('PATCH', '**/rest/v1/orders?id=eq.MOCK-ORDER-999*', (req) => {
      const status = req.body.status || 'cooking';
      req.reply({
        statusCode: 200,
        body: {
          id: 'MOCK-ORDER-999',
          tableId: TABLE_ID,
          items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 2, category: 'Makanan' }],
          subtotal: 50000,
          total: 55000,
          notes: 'Ekstra pedas ya chef!',
          orderMode: 'dine-in',
          status: status,
          type: 'guest',
          created_at: new Date().toISOString()
        }
      });
    }).as('patchOrder');

    // 4. Visit the waiter dashboard
    cy.visit('/#/waiter');

    // 5. Assert dashboard UI elements and active order card
    cy.contains('Dapur · Kedai Elvera 57').should('be.visible');
    cy.contains('Chief Chef Dapur').should('be.visible');
    cy.contains(`Meja ${TABLE_ID}`).should('be.visible');
    cy.contains('Nasi Goreng Jawa').should('be.visible');
    cy.contains('Ekstra pedas ya chef!').should('be.visible');

    // 6. Action: Click "Mulai Masak"
    cy.get('button').contains('Mulai Masak').click();

    // Verify API was called
    cy.wait('@patchOrder');

    // 7. Verify status button updates to "Selesai Masak — Siap Antar"
    cy.get('button').contains('Selesai Masak — Siap Antar').should('be.visible');

    // Action: Click "Selesai Masak — Siap Antar"
    // (Re-mock the GET request to return an empty array, simulating the order leaving the cooking queue)
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: []
    }).as('fetchEmptyOrders');

    cy.get('button').contains('Selesai Masak — Siap Antar').click();
    cy.wait('@patchOrder');

    // The order card should be gone and show empty queue text
    cy.contains(`Meja ${TABLE_ID}`).should('not.exist');
    cy.contains('Tidak ada pesanan masuk').should('be.visible');
  });

  it('should successfully handle ready orders as Waiter Staff (Pelayan)', () => {
    // 1. Inject Waiter Session into LocalStorage
    cy.window().then((win) => {
      win.localStorage.setItem('pawon_session', JSON.stringify({
        role: 'waiter',
        name: 'Waiter Ganteng',
        username: 'waiter'
      }));
    });

    // 2. Mock ready order for Waiter
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: [
        {
          id: 'MOCK-ORDER-777',
          tableId: TABLE_ID,
          items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 1, category: 'Makanan' }],
          subtotal: 25000,
          total: 27500,
          notes: '',
          orderMode: 'dine-in',
          status: 'ready',
          type: 'guest',
          created_at: new Date().toISOString()
        }
      ]
    }).as('fetchReadyOrders');

    // Mock PATCH call to served status (Sudah Disajikan)
    cy.intercept('PATCH', '**/rest/v1/orders?id=eq.MOCK-ORDER-777*', {
      statusCode: 200,
      body: {
        id: 'MOCK-ORDER-777',
        tableId: TABLE_ID,
        items: [{ id: 'menu_001', name: 'Nasi Goreng Jawa', price: 25000, qty: 1, category: 'Makanan' }],
        subtotal: 25000,
        total: 27500,
        notes: '',
        orderMode: 'dine-in',
        status: 'served',
        type: 'guest',
        created_at: new Date().toISOString()
      }
    }).as('patchServed');

    // 3. Visit the waiter dashboard
    cy.visit('/#/waiter');

    // 4. Assert Waiter UI components
    cy.contains('Pelayan · Kedai Elvera 57').should('be.visible');
    cy.contains('Waiter Ganteng').should('be.visible');
    cy.contains(`Meja ${TABLE_ID}`).should('be.visible');

    // 5. Action: Click "Sudah Disajikan ke Meja A8"
    // (Re-mock the GET request to return an empty array, simulating the order leaving the ready queue)
    cy.intercept('GET', '**/rest/v1/orders?*', {
      statusCode: 200,
      body: []
    }).as('fetchEmptyReadyOrders');

    cy.get('button').contains(`Sudah Disajikan ke Meja ${TABLE_ID}`).click();
    cy.wait('@patchServed');

    // The order should disappear, showing empty queue banner
    cy.contains(`Meja ${TABLE_ID}`).should('not.exist');
    cy.contains('Tidak ada pesanan siap antar').should('be.visible');
  });
});
