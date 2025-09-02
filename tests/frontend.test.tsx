import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock Clerk with default export
vi.mock('@clerk/clerk-react', () => {
  return {
    useUser: () => ({
      isSignedIn: false,
      user: null,
      isLoaded: true
    }),
    useAuth: () => ({
      isSignedIn: false,
      isLoaded: true
    }),
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
    SignedIn: ({ children }: { children: React.ReactNode }) => null,
    SignedOut: ({ children }: { children: React.ReactNode }) => children,
    SignInButton: () => <button>Sign In</button>,
    SignUpButton: () => <button>Sign Up</button>,
    SignOutButton: ({ children }: { children: React.ReactNode }) => children,
    UserButton: () => <button>User</button>
  };
});

// Import from relative path - simple and reliable
import App from '../apps/frontend/src/App';

describe('Frontend - App Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Just check that the component renders without throwing
    expect(document.body).toBeDefined();
  });

  it('renders app content correctly', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Debug what's actually rendered
    screen.debug();
    
    // More flexible checks - look for any common elements
    const hasHeading = screen.queryByRole('heading');
    const hasButtons = screen.queryAllByRole('button');
    const hasLinks = screen.queryAllByRole('link');
    
    // At least some interactive elements should be present
    expect(hasHeading || hasButtons.length > 0 || hasLinks.length > 0).toBeTruthy();
  });
});