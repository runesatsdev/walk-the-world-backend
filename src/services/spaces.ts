import { ApiService } from './api';

export interface SpaceSession {
  spaceId: string;
  startTime: number;
  duration: number;
  endTime?: number;
}

export class SpacesService {
  private static instance: SpacesService;
  private apiService: ApiService;
  private activeSessions: Map<number, SpaceSession> = new Map();
  private minDuration = 10 * 60 * 1000; // 10 minutes

  static getInstance(): SpacesService {
    if (!SpacesService.instance) {
      SpacesService.instance = new SpacesService();
    }
    return SpacesService.instance;
  }

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async initialize(): Promise<void> {
    // Load any pending sessions from storage
    const stored = await chrome.storage.local.get(['pendingSpaceSessions']);
    const pendingSessions = stored.pendingSpaceSessions || [];

    // Resume tracking for any active sessions
    for (const session of pendingSessions) {
      if (!session.endTime) {
        // This was an active session when extension was last running
        // We'll assume it ended when extension was not running
        await this.endSession(session);
      }
    }
  }

  async handleSpacesNavigation(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
    if (!tab.url?.includes('twitter.com/i/spaces')) {
      return;
    }

    const spaceId = this.extractSpaceId(tab.url);
    if (!spaceId) return;

    // Check if we already have an active session for this tab
    if (this.activeSessions.has(tabId)) {
      const existingSession = this.activeSessions.get(tabId)!;
      if (existingSession.spaceId === spaceId) {
        return; // Same space, continue tracking
      } else {
        // Different space, end previous session
        await this.endSession(existingSession);
      }
    }

    // Start new session
    const session: SpaceSession = {
      spaceId,
      startTime: Date.now(),
      duration: 0
    };

    this.activeSessions.set(tabId, session);

    // Set up periodic checks
    this.startTracking(tabId);

    // Log telemetry
    await this.apiService.logTelemetry('space_session_started', { spaceId });
  }

  private extractSpaceId(url: string): string | null {
    const match = url.match(/\/i\/spaces\/([^/?]+)/);
    return match ? match[1] : null;
  }

  private startTracking(tabId: number): void {
    const checkInterval = setInterval(async () => {
      const session = this.activeSessions.get(tabId);
      if (!session) {
        clearInterval(checkInterval);
        return;
      }

      // Check if tab still exists and is on the space
      try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab || !tab.url?.includes('twitter.com/i/spaces') ||
            !tab.url.includes(session.spaceId)) {
          // Tab closed or navigated away
          await this.endSession(session);
          this.activeSessions.delete(tabId);
          clearInterval(checkInterval);
          return;
        }

        // Update duration
        session.duration = Date.now() - session.startTime;

        // Check if minimum duration reached and reward should be granted
        if (session.duration >= this.minDuration && !session.endTime) {
          await this.grantReward(session);
          session.endTime = Date.now();
        }
      } catch (error) {
        // Tab no longer exists
        await this.endSession(session);
        this.activeSessions.delete(tabId);
        clearInterval(checkInterval);
      }
    }, 30000); // Check every 30 seconds
  }

  private async endSession(session: SpaceSession): Promise<void> {
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Save session data
    await this.saveSession(session);

    // Log telemetry
    await this.apiService.logTelemetry('space_session_ended', {
      spaceId: session.spaceId,
      duration: session.duration
    });
  }

  private async grantReward(session: SpaceSession): Promise<void> {
    try {
      // Call API to grant reward
      const result = await this.apiService.claimReward(`space_${session.spaceId}_${session.startTime}`);

      if (result.success) {
        // Show notification
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon128.png'),
          title: 'Xeet Reward Earned!',
          message: `+${result.amount} Xeets for Space participation`
        });

        // Log successful reward
        await this.apiService.logTelemetry('space_reward_granted', {
          spaceId: session.spaceId,
          amount: result.amount
        });
      }
    } catch (error) {
      console.error('Failed to grant space reward:', error);
    }
  }

  private async saveSession(session: SpaceSession): Promise<void> {
    const stored = await chrome.storage.local.get(['spaceSessions']);
    const sessions = stored.spaceSessions || [];
    sessions.push(session);

    // Keep only last 100 sessions
    if (sessions.length > 100) {
      sessions.splice(0, sessions.length - 100);
    }

    await chrome.storage.local.set({ spaceSessions: sessions });
  }

  // Get session statistics
  async getSessionStats(): Promise<{
    totalSessions: number;
    totalDuration: number;
    averageDuration: number;
  }> {
    const stored = await chrome.storage.local.get(['spaceSessions']);
    const sessions = stored.spaceSessions || [];

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum: number, session: any) => sum + session.duration, 0);
    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    return {
      totalSessions,
      totalDuration,
      averageDuration
    };
  }
}