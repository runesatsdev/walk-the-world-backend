import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface AuthStatus {
  isAuthenticated: boolean;
  userId?: string;
}

interface UserStats {
  dailyXeets: number;
  streak: number;
  tasksCompleted: number;
}

interface Settings {
  feedbackEnabled: boolean;
  spacesTrackingEnabled: boolean;
  notificationsEnabled: boolean;
}

const Popup: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ isAuthenticated: false });
  const [stats, setStats] = useState<UserStats>({ dailyXeets: 0, streak: 0, tasksCompleted: 0 });
  const [settings, setSettings] = useState<Settings>({
    feedbackEnabled: true,
    spacesTrackingEnabled: true,
    notificationsEnabled: true
  });

  useEffect(() => {
    initializePopup();
  }, []);

  const initializePopup = async () => {
    try {
      // Get auth status
      // const authResponse = await chrome.runtime.sendMessage('dmkcmmakeladpkaeiahekcmcbkjkfdph', { type: 'AUTH_STATUS' });
      const authResponse = {
        isAuthenticated: false,
        userId: '12345'
      };
      
      setAuthStatus(authResponse);

      if (authResponse.isAuthenticated) {
        // Load user stats and settings
        await loadUserData();
      }
    } catch (err) {
      console.error('Popup initialization error:', err);
      setError('Failed to initialize extension');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      // Load stats from storage
      const stored = await chrome.storage.local.get(['dailyStats', 'settings']);
      setStats(stored.dailyStats || { dailyXeets: 0, streak: 0, tasksCompleted: 0 });
      setSettings(stored.settings || settings);
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const handleAuth = async () => {
    // try {
    //   setLoading(true);
    //   const result = await chrome.runtime.sendMessage({ type: 'AUTHENTICATE' });
    //   if (result.success) {
    //     setAuthStatus(result.authStatus);
    //     await loadUserData();
    //   }
    // } catch (err) {
    //   setError('Authentication failed');
    //   console.error('Auth error:', err);
    // } finally {
    //   setLoading(false);
    // }
    chrome.windows.create({
      url: chrome.runtime.getURL('auth.html'),
      type: 'panel',
      width: 380,
      height: 400,
      left: Math.round((screen.width - 380) / 2),
    });

  };

  const handleSettingToggle = async (setting: keyof Settings) => {
    const newSettings = { ...settings, [setting]: !settings[setting] };
    setSettings(newSettings);

    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: newSettings
      });
    } catch (err) {
      console.error('Failed to update settings:', err);
      // Revert on error
      setSettings(settings);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">★</div>
        <h1 className="title">Xeet Extension</h1>
        <p className="subtitle">Improve signals, earn rewards</p>
      </div>

      {!authStatus.isAuthenticated ? (
        <div className="auth-section">
          <button className="auth-btn" onClick={handleAuth}>
            Sign in with Xeet
          </button>
          <p className="auth-status">Link your X account to get started</p>
        </div>
      ) : (
        <div className="main-content">
          <div className="stats-section">
            <div className="stat-item">
              <span className="stat-label">Today's Xeets</span>
              <span className="stat-value">{stats.dailyXeets}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Streak</span>
              <span className="stat-value">{stats.streak} days</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tasks Completed</span>
              <span className="stat-value">{stats.tasksCompleted}</span>
            </div>
          </div>

          <div className="settings-section">
            <div className="setting-item">
              <span className="setting-label">Feedback Prompts</span>
              <div
                className={`toggle ${settings.feedbackEnabled ? 'active' : ''}`}
                onClick={() => handleSettingToggle('feedbackEnabled')}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>
            <div className="setting-item">
              <span className="setting-label">Spaces Tracking</span>
              <div
                className={`toggle ${settings.spacesTrackingEnabled ? 'active' : ''}`}
                onClick={() => handleSettingToggle('spacesTrackingEnabled')}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>
            <div className="setting-item">
              <span className="setting-label">Notifications</span>
              <div
                className={`toggle ${settings.notificationsEnabled ? 'active' : ''}`}
                onClick={() => handleSettingToggle('notificationsEnabled')}
              >
                <div className="toggle-slider"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles (embedded for simplicity)
const styles = `
  body {
    width: 350px;
    min-height: 500px;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .container {
    padding: 20px;
  }

  .header {
    text-align: center;
    margin-bottom: 24px;
  }

  .logo {
    width: 48px;
    height: 48px;
    background: #ffd700;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    margin: 0 auto 12px;
  }

  .title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 4px 0;
  }

  .subtitle {
    font-size: 14px;
    opacity: 0.8;
    margin: 0;
  }

  .auth-section {
    background: rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    margin-bottom: 20px;
  }

  .auth-btn {
    background: #1d9bf0;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    margin-bottom: 12px;
  }

  .auth-btn:hover {
    background: #1a91da;
  }

  .auth-status {
    font-size: 14px;
    opacity: 0.8;
  }

  .stats-section {
    background: rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .stat-item:last-child {
    margin-bottom: 0;
  }

  .stat-label {
    font-size: 14px;
    opacity: 0.8;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
  }

  .settings-section {
    background: rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 20px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .setting-label {
    font-size: 14px;
  }

  .toggle {
    position: relative;
    width: 44px;
    height: 24px;
    background: rgba(255,255,255,0.3);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.3s ease;
  }

  .toggle.active {
    background: #1d9bf0;
  }

  .toggle-slider {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s ease;
  }

  .toggle.active .toggle-slider {
    transform: translateX(20px);
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    background: rgba(255,59,48,0.1);
    border: 1px solid rgba(255,59,48,0.3);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #ff6b6b;
  }

  .hidden {
    display: none;
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Render React app
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}