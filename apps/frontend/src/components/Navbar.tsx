import React from 'react';
import { useUser, SignOutButton } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";

interface NavbarProps {
  userInfo?: {
    _id: string;
    email: string;
    credits: number;
  } | null;
  showCredits?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ userInfo, showCredits = true }) => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper function to check if current path is active
  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <i className="fas fa-microphone-alt"></i>
        <span>AI Narration Studio</span>
      </div>
      
      <ul className="nav-links">
        <li>
          <a 
            href="/home" 
            className={isActivePath('/') || isActivePath('/home') ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); navigate('/home'); }}
          >
            <i className="fas fa-home"></i> Home
          </a>
        </li>
        
        {isSignedIn && (
          <>
            <li>
              <a 
                href="/pricing"
                className={isActivePath('/pricing') ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}
              >
                <i className="fas fa-tags"></i> Pricing
              </a>
            </li>
            
            <li>
              <a 
                href="/history"
                className={isActivePath('/history') ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); navigate('/history'); }}
              >
                <i className="fas fa-history"></i> History
              </a>
            </li>
          </>
        )}

        {!isSignedIn ? (
          <>
            <li>
              <a 
                href="/login"
                className={isActivePath('/login') ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); navigate('/login'); }}
              >
                <i className="fas fa-sign-in-alt"></i> Login
              </a>
            </li>
            <li>
              <a 
                href="/signup"
                className={isActivePath('/signup') ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); navigate('/signup'); }}
              >
                <i className="fas fa-user-plus"></i> Sign Up
              </a>
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="user-info">
                <i className="fas fa-user"></i> {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
              </span>
            </li>
            
            {showCredits && isSignedIn && (
              <li>
                <span className="credit-balance">
                  <i className="fas fa-coins"></i> {userInfo?.credits ?? 0} credits
                </span>
              </li>
            )}
            
            <li>
              <SignOutButton>
                <button className="sign-out-btn">
                  <i className="fas fa-sign-out-alt"></i> Sign Out
                </button>
              </SignOutButton>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;