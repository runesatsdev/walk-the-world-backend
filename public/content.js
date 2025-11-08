// Content script for X.com to detect Spaces and enable reporting
(function() {
  'use strict';

  let currentSpaceSession = null;
  let sessionStartTime = null;
  const MIN_DURATION_MINUTES = 5; // Minimum duration for reward

  // Function to detect if we're in a Space
  function detectSpace() {
    // Look for Space-specific elements
    const spaceElements = document.querySelectorAll('[data-testid*="space"], [role="group"][aria-label*="Space"]');
    const spaceTitle = document.querySelector('[data-testid="space-title"], h1[data-testid*="space"]');

    if (spaceElements.length > 0 || spaceTitle) {
      const spaceId = extractSpaceId();
      const title = spaceTitle ? spaceTitle.textContent : 'Unknown Space';
      const host = extractHost();

      if (!currentSpaceSession || currentSpaceSession.id !== spaceId) {
        startSpaceSession(spaceId, title, host);
      }
    } else if (currentSpaceSession) {
      endSpaceSession();
    }
  }

  function extractSpaceId() {
    const url = window.location.href;
    const spaceMatch = url.match(/\/i\/spaces\/([^/?]+)/);
    return spaceMatch ? spaceMatch[1] : Date.now().toString();
  }

  function extractHost() {
    // Try to find the host from the page
    const hostElement = document.querySelector('[data-testid="space-host"], [role="link"][href*="/"]');
    if (hostElement) {
      return hostElement.textContent || hostElement.getAttribute('href')?.split('/').pop() || 'Unknown';
    }
    return 'Unknown';
  }

  function startSpaceSession(spaceId, title, host) {
    currentSpaceSession = {
      id: spaceId,
      title: title,
      host: host,
      startTime: new Date().toISOString()
    };
    sessionStartTime = Date.now();

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SPACE_JOINED',
      data: currentSpaceSession
    });

    console.log('Joined Space:', currentSpaceSession);
  }

  function endSpaceSession() {
    if (currentSpaceSession && sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime) / (1000 * 60)); // in minutes
      const rewardEarned = duration >= MIN_DURATION_MINUTES;

      const sessionData = {
        ...currentSpaceSession,
        duration: duration,
        rewardEarned: rewardEarned,
        completed: true
      };

      // Notify background script
      chrome.runtime.sendMessage({
        type: 'SPACE_LEFT',
        data: sessionData
      });

      console.log('Left Space:', sessionData);
    }

    currentSpaceSession = null;
    sessionStartTime = null;
  }

  // Add report button overlay
  function addReportOverlay() {
    // Remove existing overlay if present
    const existingOverlay = document.getElementById('xeet-report-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'xeet-report-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border: 2px solid #dc2626;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        cursor: pointer;
        font-size: 12px;
        color: #dc2626;
        font-weight: bold;
      " onclick="window.postMessage({type: 'XEET_REPORT_CLICK'}, '*')">
        🚩 Report
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // Listen for report button clicks
  window.addEventListener('message', (event) => {
    if (event.data.type === 'XEET_REPORT_CLICK') {
      // Open extension popup or send message to background
      chrome.runtime.sendMessage({
        type: 'OPEN_REPORT_TAB'
      });
    }
  });

  // Initialize
  function init() {
    // Check for Spaces periodically
    setInterval(detectSpace, 5000); // Check every 5 seconds

    // Add report overlay
    addReportOverlay();

    // Listen for page navigation
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          detectSpace();
          addReportOverlay();
        }, 2000); // Wait for page to load
      }
    }, 1000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (currentSpaceSession) {
      endSpaceSession();
    }
  });
})();