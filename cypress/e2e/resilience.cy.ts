describe('Kedai Elvera 57 - Resilience & Error Handling E2E (Cypress Mocked-API)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should redirect unauthenticated user back to login when visiting admin directly', () => {
    // No session injected — visit admin directly
    cy.visit('/#/admin');

    // Should redirect back to login page (since there is no session)
    cy.contains('Selamat datang kembali', { timeout: 8000 }).should('be.visible');
  });

  it('should show 404 page for invalid routes', () => {
    cy.visit('/#/invalid-page');

    cy.contains('404').should('be.visible');
    cy.contains('Halaman tidak ditemukan').should('be.visible');
  });

  it('should handle Supabase API failure gracefully on Guest Menu page', () => {
    // Intercept menu items with a server error
    cy.intercept('GET', '**/rest/v1/menu_items?*', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('failedMenuItems');

    cy.visit('/#/menu/A1');

    // Welcome modal should still load (uses SEED_MENU fallback)
    cy.get('button', { timeout: 10000 }).contains('Masuk Ke Menu').should('be.visible').click();
    cy.contains('Selamat Datang di').should('be.visible');
    cy.get('button').contains('Lanjut').click();
    cy.get('button').contains('Mulai Pesan Sekarang!').click();

    // Menu items should still render via SEED_MENU fallback (offline-first behavior)
    cy.get('button').contains('Makanan').should('be.visible');
    cy.contains('Nasi Goreng Jawa').should('be.visible');
  });

  it('should persist session in localStorage across page reload', () => {
    // Inject session
    cy.window().then((win) => {
      win.localStorage.setItem('pawon_session', JSON.stringify({
        role: 'admin',
        name: 'Admin Kedai Elvera 57',
        username: 'admin'
      }));
    });

    // Mock all data endpoints with empty
    cy.intercept('GET', '**/rest/v1/orders?*', { statusCode: 200, body: [] }).as('fetchOrders');
    cy.intercept('GET', '**/rest/v1/meja?*', { statusCode: 200, body: [] }).as('fetchMeja');
    cy.intercept('GET', '**/rest/v1/menu_items?*', { statusCode: 200, body: [] }).as('fetchMenuItems');
    cy.intercept('GET', '**/rest/v1/inventory?*', { statusCode: 200, body: [] }).as('fetchInventory');
    cy.intercept('GET', '**/rest/v1/inventory_logs?*', { statusCode: 200, body: [] }).as('fetchInventoryLogs');
    cy.intercept('GET', '**/rest/v1/transactions?*', { statusCode: 200, body: [] }).as('fetchTransactions');

    cy.visit('/#/admin');
    cy.contains('Admin Panel').should('be.visible');

    // Reload the page
    cy.reload();

    // Session should persist — still on admin page
    cy.contains('Admin Panel').should('be.visible');

    // Verify localStorage still has session
    cy.window().then((win) => {
      const session = win.localStorage.getItem('pawon_session');
      expect(session).to.not.be.null;
      expect(JSON.parse(session || '{}').role).to.equal('admin');
    });
  });

  it('should allow login with different roles (Waiter) and route to waiter dashboard', () => {
    cy.visit('/');

    // Select Waiter role
    cy.get('button').contains('Waiter').click();

    // Type correct waiter password
    cy.get('input[placeholder="Password Waiter"]').type('[REDACTED_WAITER_PASSWORD]');

    // Submit
    cy.get('button').contains('Masuk').click();

    // Should redirect to waiter dashboard
    cy.url().should('include', '#/waiter');
  });

  it('should allow login with Kitchen role and route to kitchen dashboard', () => {
    cy.visit('/');

    // Select Dapur role
    cy.get('button').contains('Dapur').click();

    // Type correct kitchen password
    cy.get('input[placeholder="Password Dapur"]').type('[REDACTED_KITCHEN_PASSWORD]');

    // Submit
    cy.get('button').contains('Masuk').click();

    // Should redirect to kitchen dashboard
    cy.url().should('include', '#/kitchen');
  });
});
