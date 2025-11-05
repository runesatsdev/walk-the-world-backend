import { AuthService } from './auth';

export interface ProfileData {
  userId: string;
  xeetScore: number;
  averageSignal: number;
  noiseRatio: number;
  recentRank: number;
  badges: string[];
}

export interface FeedbackTask {
  id: string;
  type: 'post' | 'creator';
  content: {
    text?: string;
    author?: string;
    url?: string;
  };
  timestamp: number;
}

export interface FeedbackSubmission {
  taskId: string;
  signalStrength: number; // 1-5
  authenticity: number; // 1-5
  sentiment: 'positive' | 'neutral' | 'negative';
  comment?: string;
}

export interface ReportData {
  targetUserId?: string;
  tweetId?: string;
  reason: string;
  customReason?: string;
  screenshot?: string;
}

export class ApiService {
  private static instance: ApiService;
  private baseUrl: string;
  private authService: AuthService;

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  constructor() {
    this.baseUrl = process.env.VITE_XEET_API_URL || 'https://api.xeet.com';
    this.authService = AuthService.getInstance();
  }

  async initialize(): Promise<void> {
    // Initialize API service
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const accessToken = this.authService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.authService.initialize();
      const newToken = this.authService.getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers
        });
      }
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getProfileData(userId: string): Promise<ProfileData> {
    return this.makeRequest(`/api/v1/users/${userId}/profile`);
  }

  async getNextFeedbackTask(): Promise<FeedbackTask | null> {
    try {
      const response = await this.makeRequest('/api/v1/extension/tasks/next');
      return response.task || null;
    } catch (error) {
      console.error('Failed to get feedback task:', error);
      return null;
    }
  }

  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; reward?: number }> {
    return this.makeRequest('/api/v1/extension/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback)
    });
  }

  async submitReport(report: ReportData): Promise<{ success: boolean }> {
    return this.makeRequest('/api/v1/extension/reports', {
      method: 'POST',
      body: JSON.stringify(report)
    });
  }

  async claimReward(rewardId: string): Promise<{ success: boolean; amount: number }> {
    return this.makeRequest('/api/v1/extension/rewards/claim', {
      method: 'POST',
      body: JSON.stringify({ rewardId })
    });
  }

  async getExtensionConfig(): Promise<any> {
    return this.makeRequest('/api/v1/extension/config');
  }

  async logTelemetry(event: string, data?: any): Promise<void> {
    try {
      await this.makeRequest('/api/v1/extension/telemetry', {
        method: 'POST',
        body: JSON.stringify({
          event,
          timestamp: Date.now(),
          data,
          extensionVersion: chrome.runtime.getManifest().version
        })
      });
    } catch (error) {
      console.error('Telemetry logging failed:', error);
    }
  }
}