describe('Kedai Elvera 57 - Cypress Login Flow', () => {
  beforeEach(() => {
    // Clear localStorage and visit login page
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should render the login form and check visual elements', () => {
    cy.contains('Selamat datang kembali').should('be.visible');
    cy.contains('Pilih peran lalu masukkan password.').should('be.visible');
    cy.get('button').contains('Admin').should('be.visible');
    cy.get('button').contains('Waiter').should('be.visible');
    cy.get('button').contains('Dapur').should('be.visible');
  });

  it('should show error when incorrect password is typed', () => {
    // Input wrong password
    cy.get('input[placeholder="Password Admin"]').type('wrongpassword');

    // Click submit
    cy.get('button').contains('Masuk').click();

    // Verify error message
    cy.contains('Password salah. Coba lagi.').should('be.visible');
  });

  it('should successfully log in as Admin and redirect to admin panel', () => {
    // Input correct password
    cy.get('input[placeholder="Password Admin"]').type('[REDACTED_ADMIN_PASSWORD]');

    // Click submit
    cy.get('button').contains('Masuk').click();

    // Wait for the hash router to redirect to admin dashboard
    cy.url().should('include', '#/admin');

    // Verify localStorage has correct session data
    cy.window().then((window) => {
      const session = window.localStorage.getItem('pawon_session');
      expect(session).to.not.be.null;
      expect(JSON.parse(session || '{}').role).to.equal('admin');
    });
  });
});
