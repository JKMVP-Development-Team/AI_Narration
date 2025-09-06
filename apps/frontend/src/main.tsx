import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import LandingPage from "./LandingPage";
import CreditHistory from './CreditHistory';
import "./App.css";

import Signup from './Signup'
import Login from './Login'

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
      <BrowserRouter>
        <ClerkProvider publishableKey={clerkPubKey}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/home" element={<App />} />
              <Route path="/signup/*" element={<Signup />} />
              <Route path="/login/*" element={<Login />} />
              <Route path="/history" element={<CreditHistory />} /> 
            </Routes>
        </ClerkProvider>
      </BrowserRouter>
  </React.StrictMode>
);