import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import './App.css';

const Signup: React.FC = () => {
  return (
    <div className="container">
      {/* Navigation Bar */}
      <Navbar showCredits={false} />

      <div className="auth-container">
        <div className="auth-card">
          <div className="clerk-auth-wrapper">
            <SignUp
              routing="path"
              path="/signup"
              signInUrl="/login"
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  formButtonPrimary: "primary-btn auth-btn",
                  card: "clerk-card",
                  headerTitle: "clerk-header",
                  headerSubtitle: "clerk-subtitle",
                  socialButtonsBlockButton: {
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    border: "1px solid #e5e5e5",
                    "&:hover": {
                      backgroundColor: "#f5f5f5"
                    }
                  }
                },
                variables: {
                  colorPrimary: "#4f46e5",
                  colorText: "#ffffff",
                  colorBackground: "#1a1a1a",
                }
              }}
              
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;