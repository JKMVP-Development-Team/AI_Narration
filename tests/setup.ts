import '@testing-library/jest-dom';

// Global test setup
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';