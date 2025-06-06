/// <reference types="cypress" />

// @ts-nocheck

describe('Sessions Flow E2E Tests', () => {
  it('should navigate to session detail page', () => {
    cy.visit('/sessions');
    cy.contains('Session 1').click();
    cy.url().should('include', '/sessions/1');
    cy.contains('Details for session 1');
  });
}); 