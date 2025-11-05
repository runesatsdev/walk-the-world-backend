import { ApiService, ProfileData } from './services/api';

class ContentScript {
  private apiService: ApiService;
  private observer: MutationObserver | null = null;

  constructor() {
    this.apiService = ApiService.getInstance();
    this.initialize();
  }

  private async initialize() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  private setup() {
    // Set up mutation observer for dynamic content
    this.setupObserver();

    // Check current page and inject overlays
    this.handlePageChange();

    // Listen for navigation changes
    window.addEventListener('popstate', () => this.handlePageChange());
    window.addEventListener('pushstate', () => this.handlePageChange());

    // Override history methods to detect SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handlePageChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handlePageChange();
    };
  }

  private setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          this.handleContentChanges(mutation);
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private handlePageChange() {
    const url = window.location.href;

    if (url.includes('/i/spaces/')) {
      // Handle Spaces page
      this.handleSpacesPage();
    } else if (url.match(/\/[^/]+$/)) {
      // Handle profile page
      this.handleProfilePage();
    }
  }

  private handleContentChanges(mutation: MutationRecord) {
    // Check if profile overlay needs to be added/updated
    const profileElements = document.querySelectorAll('[data-testid="User-Name"]');
    profileElements.forEach(element => {
      if (!element.closest('.xeet-profile-overlay')) {
        this.injectProfileOverlay(element as HTMLElement);
      }
    });
  }

  private async handleProfilePage() {
    // Extract username from URL
    const match = window.location.pathname.match(/^\/([^/]+)/);
    if (!match) return;

    const username = match[1];

    // Find the profile header element
    const profileHeader = document.querySelector('[data-testid="User-Name"]');
    if (profileHeader && !profileHeader.closest('.xeet-profile-overlay')) {
      await this.injectProfileOverlay(profileHeader as HTMLElement);
    }
  }

  private async injectProfileOverlay(targetElement: HTMLElement) {
    try {
      // Get user ID from the page data or API
      const userId = this.extractUserIdFromPage();

      if (!userId) return;

      // Fetch profile data
      const profileData = await this.apiService.getProfileData(userId);

      // Create overlay
      const overlay = this.createProfileOverlay(profileData);
      targetElement.parentElement?.insertBefore(overlay, targetElement.nextSibling);

    } catch (error) {
      console.error('Failed to inject profile overlay:', error);
    }
  }

  private extractUserIdFromPage(): string | null {
    // Try to extract from page data attributes or scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      const match = content.match(/"id":"(\d+)"/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private createProfileOverlay(data: ProfileData): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'xeet-profile-overlay';
    overlay.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.2);
    `;

    overlay.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 20px; height: 20px; background: #ffd700; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">★</div>
          <span style="font-weight: 600;">Xeet Score</span>
        </div>
        <button class="xeet-collapse-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">−</button>
      </div>

      <div class="xeet-metrics">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">${data.xeetScore.toFixed(1)}</div>
            <div style="opacity: 0.8; font-size: 12px;">Overall Score</div>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">#${data.recentRank}</div>
            <div style="opacity: 0.8; font-size: 12px;">Leaderboard</div>
          </div>
        </div>

        <div style="display: flex; gap: 16px; font-size: 12px;">
          <div>
            <span style="opacity: 0.8;">Signal:</span>
            <span style="font-weight: 600;">${(data.averageSignal * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span style="opacity: 0.8;">Noise:</span>
            <span style="font-weight: 600;">${(data.noiseRatio * 100).toFixed(0)}%</span>
          </div>
        </div>

        ${data.badges.length > 0 ? `
          <div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${data.badges.map(badge => `<span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; font-size: 11px;">${badge}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div style="margin-top: 12px; text-align: center;">
        <a href="#" style="color: #ffd700; text-decoration: none; font-size: 12px; font-weight: 600;">View Full Analytics →</a>
      </div>
    `;

    // Add collapse functionality
    const collapseBtn = overlay.querySelector('.xeet-collapse-btn') as HTMLElement;
    const metricsDiv = overlay.querySelector('.xeet-metrics') as HTMLElement;

    collapseBtn.addEventListener('click', () => {
      if (metricsDiv.style.display === 'none') {
        metricsDiv.style.display = 'block';
        collapseBtn.textContent = '−';
      } else {
        metricsDiv.style.display = 'none';
        collapseBtn.textContent = '+';
      }
    });

    return overlay;
  }

  private handleSpacesPage() {
    // Spaces handling is done in background script
    // This is just for any content script specific logic
  }

  // Handle messages from background script
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SHOW_FEEDBACK_PROMPT') {
        this.showFeedbackPrompt(message.data);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  private showFeedbackPrompt(task: any) {
    // Create and show feedback modal
    const modal = this.createFeedbackModal(task);
    document.body.appendChild(modal);
  }

  private createFeedbackModal(task: any): HTMLElement {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background: white; border-radius: 16px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Rate this ${task.type}</h3>
          <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Help improve Xeet signals</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.4;">${task.content.text || 'Content preview not available'}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">Signal Strength (1-5)</label>
          <div style="display: flex; gap: 8px;">
            ${[1,2,3,4,5].map(n => `
              <button class="signal-btn" data-value="${n}" style="flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;">${n}</button>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">Authenticity (1-5)</label>
          <div style="display: flex; gap: 8px;">
            ${[1,2,3,4,5].map(n => `
              <button class="auth-btn" data-value="${n}" style="flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;">${n}</button>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">Sentiment</label>
          <div style="display: flex; gap: 8px;">
            <button class="sentiment-btn" data-value="positive" style="flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;">👍 Positive</button>
            <button class="sentiment-btn" data-value="neutral" style="flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;">😐 Neutral</button>
            <button class="sentiment-btn" data-value="negative" style="flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;">👎 Negative</button>
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="submit-btn" style="flex: 1; padding: 12px; background: #1d9bf0; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;" disabled>Submit & Earn Xeets</button>
          <button class="skip-btn" style="padding: 12px 16px; background: none; border: 1px solid #e1e5e9; border-radius: 8px; cursor: pointer;">Skip</button>
        </div>
      </div>
    `;

    // Add interaction handlers
    this.setupFeedbackModalHandlers(modal, task);

    return modal;
  }

  private setupFeedbackModalHandlers(modal: HTMLElement, task: any) {
    let selectedSignal = 0;
    let selectedAuthenticity = 0;
    let selectedSentiment = '';

    const signalBtns = modal.querySelectorAll('.signal-btn');
    const authBtns = modal.querySelectorAll('.auth-btn');
    const sentimentBtns = modal.querySelectorAll('.sentiment-btn');
    const submitBtn = modal.querySelector('.submit-btn') as HTMLButtonElement;
    const skipBtn = modal.querySelector('.skip-btn') as HTMLElement;

    const updateSubmitBtn = () => {
      submitBtn.disabled = !(selectedSignal > 0 && selectedAuthenticity > 0 && selectedSentiment);
    };

    signalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        signalBtns.forEach(b => b.setAttribute('style', 'flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;'));
        btn.setAttribute('style', 'flex: 1; padding: 8px; border: 2px solid #1d9bf0; border-radius: 8px; background: #f0f8ff; cursor: pointer;');
        selectedSignal = parseInt((btn as HTMLElement).dataset.value!);
        updateSubmitBtn();
      });
    });

    authBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        authBtns.forEach(b => b.setAttribute('style', 'flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;'));
        btn.setAttribute('style', 'flex: 1; padding: 8px; border: 2px solid #1d9bf0; border-radius: 8px; background: #f0f8ff; cursor: pointer;');
        selectedAuthenticity = parseInt((btn as HTMLElement).dataset.value!);
        updateSubmitBtn();
      });
    });

    sentimentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sentimentBtns.forEach(b => b.setAttribute('style', 'flex: 1; padding: 8px; border: 2px solid #e1e5e9; border-radius: 8px; background: white; cursor: pointer;'));
        btn.setAttribute('style', 'flex: 1; padding: 8px; border: 2px solid #1d9bf0; border-radius: 8px; background: #f0f8ff; cursor: pointer;');
        selectedSentiment = (btn as HTMLElement).dataset.value!;
        updateSubmitBtn();
      });
    });

    submitBtn.addEventListener('click', async () => {
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'SUBMIT_FEEDBACK',
          data: {
            taskId: task.id,
            signalStrength: selectedSignal,
            authenticity: selectedAuthenticity,
            sentiment: selectedSentiment
          }
        });

        if (result.success) {
          modal.remove();
          // Show success message
          this.showSuccessToast(result.reward);
        }
      } catch (error) {
        console.error('Feedback submission failed:', error);
      }
    });

    skipBtn.addEventListener('click', () => {
      modal.remove();
    });
  }

  private showSuccessToast(reward?: number) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #00ba7c;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = reward ? `+${reward} Xeets earned!` : 'Feedback submitted!';
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize content script
new ContentScript();