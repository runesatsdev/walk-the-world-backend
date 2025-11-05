import { AuthService } from './services/auth';
import { ApiService } from './services/api';
import { FeedbackService } from './services/feedback';
import { SpacesService } from './services/spaces';
import { TelemetryService } from './services/telemetry';

class BackgroundService {
  private authService: AuthService;
  private apiService: ApiService;
  private feedbackService: FeedbackService;
  private spacesService: SpacesService;
  private telemetryService: TelemetryService;

  constructor() {
    this.authService = new AuthService();
    this.apiService = new ApiService();
    this.feedbackService = new FeedbackService();
    this.spacesService = new SpacesService();
    this.telemetryService = new TelemetryService();

    this.initialize();
  }

  private async initialize() {
    // Initialize services
    await this.authService.initialize();
    await this.apiService.initialize();
    await this.feedbackService.initialize();
    await this.spacesService.initialize();
    await this.telemetryService.initialize();

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        await this.handleFirstInstall();
      }
    });

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates for Spaces tracking
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('twitter.com/i/spaces')) {
        await this.spacesService.handleSpacesNavigation(tabId, tab);
      }
    });
  }

  private async handleFirstInstall() {
    // Set default settings
    await chrome.storage.local.set({
      extensionVersion: chrome.runtime.getManifest().version,
      installedAt: Date.now(),
      settings: {
        feedbackEnabled: true,
        spacesTrackingEnabled: true,
        notificationsEnabled: true
      }
    });

    // Log installation
    await this.telemetryService.logEvent('extension_installed');
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    try {
      switch (message.type) {
        case 'AUTH_STATUS':
          const authStatus = await this.authService.getAuthStatus();
          sendResponse(authStatus);
          break;

        case 'GET_FEEDBACK_TASK':
          const task = await this.feedbackService.getNextTask();
          sendResponse(task);
          break;

        case 'SUBMIT_FEEDBACK':
          const result = await this.feedbackService.submitFeedback(message.data);
          sendResponse(result);
          break;

        case 'GET_PROFILE_DATA':
          const profileData = await this.apiService.getProfileData(message.userId);
          sendResponse(profileData);
          break;

        case 'REPORT_CONTENT':
          const reportResult = await this.apiService.submitReport(message.data);
          sendResponse(reportResult);
          break;

        case 'CLAIM_REWARD':
          const rewardResult = await this.apiService.claimReward(message.rewardId);
          sendResponse(rewardResult);
          break;

        case 'UPDATE_SETTINGS':
          await chrome.storage.local.set({ settings: message.settings });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background message handling error:', error);
      sendResponse({ error: (error as Error).message });
    }
  }
}

// Initialize the background service
new BackgroundService();