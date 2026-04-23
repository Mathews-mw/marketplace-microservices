export const serviceConfig = {
  users: {
    url: process.env.USERS_SERVICE_URL || 'http://localhost:3000',
    timeout: 10 * 1000,
  },
  products: {
    url: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3001',
    timeout: 10 * 1000,
  },
  checkout: {
    url: process.env.CHECKOUT_SERVICE_URL || 'http://localhost:3003',
    timeout: 10 * 1000,
  },
  payments: {
    url: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3004',
    timeout: 10 * 1000,
  },
} as const;
