import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // You'll need to install react-router-dom
import './App.css'; // Reuse the same styles

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup logic here
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    alert(`Account created for ${formData.username} (${formData.email})`);
    // You would typically send this data to your backend here
  };

  return (
    <div className="container">
      {/* Navigation Bar - Same as main app */}
      <nav className="navbar">
        <div className="nav-brand">
          <i className="fas fa-microphone-alt"></i>
          <span>AI Narration Studio</span>
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/">
              <i className="fas fa-home"></i> Home
            </Link>
          </li>
          <li>
            <Link to="/signup" className="active">
              <i className="fas fa-user-plus"></i> Sign Up
            </Link>
          </li>
          <li>
            <a href="#login">
              <i className="fas fa-sign-in-alt"></i> Login
            </a>
          </li>
        </ul>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <h2>Create Your Account</h2>
          <p className="subtitle">Join AI Narration Studio to unlock all features</p>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
            </div>
            
            <button type="submit" className="primary-btn auth-btn">
              <i className="fas fa-user-plus"></i> Create Account
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Log in here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;