import { useNavigate, Link } from 'react-router-dom';
import { useUser, SignIn } from '@clerk/clerk-react';
import { useEffect } from 'react';
import Navbar from './components/Navbar';

const Login: React.FC = () => {
    const { isSignedIn } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (isSignedIn) {
        navigate('/home'); // Redirect to home after successful login
        }
    }, [isSignedIn, navigate]);

    return (
        <div className="container">
            {/* Navigation Bar */}
            <Navbar showCredits={false} />

            <div className="auth-container">
                <div className="auth-card">
                    <h2>Welcome Back</h2>
                    
                    <div className="clerk-auth-wrapper">
                    <SignIn
                        routing="path"
                        path="/login"
                        signUpUrl="/signup"
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

export default Login;
