import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

// Interface for credit history items
interface CreditHistoryItem {
  id: string;
  date: string;
  title: string;
  creditsUsed: number;
  creditsRemaining: number;
  status: 'completed' | 'processing' | 'failed';
}

const CreditHistory: React.FC = () => {
  // Sample credit history data
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([
    {
      id: '1',
      date: '2025-01-15 14:30',
      title: 'Business Presentation Narration',
      creditsUsed: 5,
      creditsRemaining: 95,
      status: 'completed'
    },
    {
      id: '2',
      date: '2025-01-14 11:15',
      title: 'Podcast Introduction',
      creditsUsed: 3,
      creditsRemaining: 92,
      status: 'completed'
    },
    {
      id: '3',
      date: '2025-01-13 16:45',
      title: 'Educational Video Voiceover',
      creditsUsed: 8,
      creditsRemaining: 84,
      status: 'completed'
    },
    {
      id: '4',
      date: '2025-01-13 09:20',
      title: 'Marketing Commercial',
      creditsUsed: 10,
      creditsRemaining: 74,
      status: 'completed'
    }
  ]);

  const [currentCredits, setCurrentCredits] = useState(74);

  return (
    <div className="container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <i className="fas fa-microphone-alt"></i>
          <span>AI Narration Studio</span>
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/home">
              <i className="fas fa-home"></i> Home
            </Link>
          </li>
          <li>
            <Link to="/history" className="active">
              <i className="fas fa-history"></i> History
            </Link>
          </li>
          <li>
            <Link to="/signup">
              <i className="fas fa-user-plus"></i> Sign Up
            </Link>
          </li>
        </ul>
      </nav>

      <div className="credit-history-container">
        <div className="credit-header">
          <h2>Credit History</h2>
          <div className="credit-balance">
            <div className="balance-card">
              <h3>Current Balance</h3>
              <div className="balance-amount">{currentCredits} credits</div>
              <button className="primary-btn">
                <i className="fas fa-plus"></i> Buy More Credits
              </button>
            </div>
          </div>
        </div>

        <div className="history-section">
          <h3>Usage History</h3>
          
          <div className="history-filters">
            <button className="filter-btn active">All</button>
            <button className="filter-btn">This Month</button>
            <button className="filter-btn">Last Month</button>
          </div>

          <div className="history-list">
            {creditHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div className="item-main">
                  <div className="item-title">{item.title}</div>
                  <div className="item-date">{item.date}</div>
                </div>
                <div className="item-details">
                  <div className={`status-badge status-${item.status}`}>
                    {item.status}
                  </div>
                  <div className="credits-used">-{item.creditsUsed} credits</div>
                  <div className="credits-remaining">{item.creditsRemaining} remaining</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="credit-info">
          <h4>About Credits</h4>
          <p>Each credit allows you to generate 1 minute of audio narration. 
             Unused credits roll over to the next month. Purchase additional 
             credits at any time.</p>
        </div>
      </div>
    </div>
  );
};

export default CreditHistory;