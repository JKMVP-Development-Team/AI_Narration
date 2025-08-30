import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from './App'
import LandingPage from "./LandingPage";
import CreditHistory from './CreditHistory';
import "./app.css";

import Signup from './Signup'

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<App />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/history" element={<CreditHistory />} /> 
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);