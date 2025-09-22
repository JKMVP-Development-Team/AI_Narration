import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from './services/apiService';
import Navbar from './components/Navbar';
import './App.css';

// Credit package definitions
// You'll need to create these products in your Stripe dashboard and get the real price IDs
const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: '100 Credits',
    price: 10,
    credits: 100,
    priceId: 'price_test_starter_100', // Replace with real Stripe price ID
    popular: false,
    description: 'Perfect for trying out our service',
    costPerCredit: 0.10
  },
  {
    id: 'pro',
    name: '500 Credits',
    price: 40,
    credits: 500,
    priceId: 'price_test_pro_500', // Replace with real Stripe price ID
    popular: true,
    description: 'Most popular for regular users',
    costPerCredit: 0.08
  },
  {
    id: 'enterprise',
    name: '1000 Credits',
    price: 70,
    credits: 1000,
    priceId: 'price_test_enterprise_1000', // Replace with real Stripe price ID
    popular: false,
    description: 'Best value for power users',
    costPerCredit: 0.07
  }
];

const PricingPage: React.FC = () => {
  const { isSignedIn, user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  const [userInfo, setUserInfo] = useState<{
    _id: string;
    email: string;
    credits: number;
    totalCreditsEverPurchased: number;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/login');
    }
  }, [isSignedIn, isLoaded, navigate]);

  // Load user info to show current credits
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!user?.id) return;
      
      try {
        const info = await apiService.getUserInfo(user.id);
        setUserInfo(info);
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };

    if (isLoaded && isSignedIn && user) {
      loadUserInfo();
    }
  }, [isLoaded, isSignedIn, user]);

  // Handle package purchase
  const handlePurchase = async (pkg: typeof CREDIT_PACKAGES[0]) => {
    if (!user?.id) {
      alert('Please sign in to purchase credits');
      return;
    }

    setIsLoading(true);
    setSelectedPackage(pkg.id);

    try {
      // Create Stripe checkout session
      const response = await apiService.createCheckoutSession(pkg.priceId, user.id);
      
      // Redirect to Stripe checkout
      window.location.href = response.url;
      
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to start checkout. Please try again.');
      setIsLoading(false);
      setSelectedPackage(null);
    }
  };

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Navigation Bar */}
      <Navbar userInfo={userInfo} showCredits={true} />

      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1>Choose Your Credit Package</h1>
        <p className="subtitle">
          Select the perfect package for your AI narration needs
        </p>
        <div className="current-balance">
          <div className="balance-card" style={{ display: 'inline-block', padding: '20px', backgroundColor: '#2a2a2a', borderRadius: '10px', margin: '20px 0' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>Current Balance</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#4CAF50' }}>
              {userInfo?.credits || 0} credits
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Cards */}
      <div className="pricing-section">
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`pricing-card ${pkg.popular ? 'popular' : ''}`}
              style={{
                backgroundColor: '#2a2a2a',
                border: pkg.popular ? '3px solid #4CAF50' : '2px solid #444',
                borderRadius: '15px',
                padding: '30px',
                textAlign: 'center',
                position: 'relative',
                transition: 'transform 0.3s ease'
              }}
            >
              {pkg.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '5px 20px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  MOST POPULAR
                </div>
              )}

              <div className="package-header" style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.5em', margin: '0 0 10px 0' }}>
                  {pkg.name}
                </h3>
                <div style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>
                  {pkg.description}
                </div>
                <div style={{ fontSize: '3em', fontWeight: 'bold', color: '#4CAF50', margin: '10px 0' }}>
                  ${pkg.price}
                </div>
                <div style={{ color: '#888', fontSize: '14px' }}>
                  ${pkg.costPerCredit.toFixed(3)} per credit
                </div>
              </div>

              <div className="package-features" style={{ marginBottom: '30px' }}>
                <div style={{ fontSize: '1.2em', color: '#fff', marginBottom: '15px' }}>
                  <i className="fas fa-coins" style={{ color: '#4CAF50', marginRight: '10px' }}></i>
                  {pkg.credits.toLocaleString()} Credits
                </div>
                
                <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6' }}>
                  <div><i className="fas fa-check" style={{ color: '#4CAF50', marginRight: '8px' }}></i>Generate approximately {Math.floor(pkg.credits / 5)} minutes of audio</div>
                  <div><i className="fas fa-check" style={{ color: '#4CAF50', marginRight: '8px' }}></i>All voice presets included</div>
                  <div><i className="fas fa-check" style={{ color: '#4CAF50', marginRight: '8px' }}></i>High-quality audio output</div>
                  <div><i className="fas fa-check" style={{ color: '#4CAF50', marginRight: '8px' }}></i>Credits never expire</div>
                </div>
              </div>

              <button
                className={`primary-btn ${pkg.popular ? 'popular-btn' : ''}`}
                onClick={() => handlePurchase(pkg)}
                disabled={isLoading && selectedPackage === pkg.id}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: pkg.popular ? '#4CAF50' : '#555',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: isLoading && selectedPackage === pkg.id ? 'not-allowed' : 'pointer',
                  opacity: isLoading && selectedPackage === pkg.id ? 0.7 : 1
                }}
              >
                {isLoading && selectedPackage === pkg.id ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-shopping-cart" style={{ marginRight: '10px' }}></i>
                    Buy Now
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section" style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#fff' }}>Frequently Asked Questions</h2>
        
        <div className="faq-item" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
          <h4 style={{ color: '#4CAF50', marginBottom: '10px' }}>How many minutes of audio can I generate?</h4>
          <p style={{ color: '#ccc', lineHeight: '1.6' }}>
            On average, 1 credit generates about 12 seconds of audio (100 characters of text). 
            So 100 credits ≈ 20 minutes, 500 credits ≈ 100 minutes, 1000 credits ≈ 200 minutes.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
          <h4 style={{ color: '#4CAF50', marginBottom: '10px' }}>Do credits expire?</h4>
          <p style={{ color: '#ccc', lineHeight: '1.6' }}>
            No! Your credits never expire. Purchase once and use them whenever you need.
          </p>
        </div>

        <div className="faq-item" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
          <h4 style={{ color: '#4CAF50', marginBottom: '10px' }}>What payment methods do you accept?</h4>
          <p style={{ color: '#ccc', lineHeight: '1.6' }}>
            We accept all major credit cards, debit cards, and digital wallets through Stripe's secure payment processing.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 JKMVP AI Narration. Secure payments powered by Stripe.</p>
      </footer>
    </div>
  );
};

export default PricingPage;