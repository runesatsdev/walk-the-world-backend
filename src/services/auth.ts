export interface AuthStatus {
  isAuthenticated: boolean;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export class AuthService {
  private static instance: AuthService;
  private authStatus: AuthStatus = { isAuthenticated: false };

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    // Load stored auth data
    const stored = await chrome.storage.session.get(['auth']);
    if (stored.auth) {
      this.authStatus = stored.auth;
      // Check if token is still valid
      if (this.isTokenExpired()) {
        await this.refreshToken();
      }
    }
  }

  async authenticate(): Promise<AuthStatus> {
    try {
      // Open OAuth flow in popup
      const authUrl = `${process.env.VITE_XEET_API_URL}/auth/extension/oauth`;
      const redirectUrl = chrome.identity.getRedirectURL();

      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: `${authUrl}?redirect_uri=${encodeURIComponent(redirectUrl)}`,
        interactive: true
      });

      if (responseUrl) {
        const url = new URL(responseUrl);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        const userId = url.searchParams.get('user_id');

        if (accessToken && userId) {
          this.authStatus = {
            isAuthenticated: true,
            userId,
            accessToken,
            refreshToken: refreshToken || undefined
          };

          // Store securely
          await this.storeAuthData();
          return this.authStatus;
        }
      }

      throw new Error('Authentication failed');
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.authStatus = { isAuthenticated: false };
    await chrome.storage.session.remove(['auth']);
  }

  getAuthStatus(): AuthStatus {
    return { ...this.authStatus };
  }

  getAccessToken(): string | undefined {
    return this.authStatus.accessToken;
  }

  private async refreshToken(): Promise<void> {
    if (!this.authStatus.refreshToken) {
      await this.logout();
      return;
    }

    try {
      const response = await fetch(`${process.env.VITE_XEET_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: this.authStatus.refreshToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.authStatus.accessToken = data.access_token;
        this.authStatus.refreshToken = data.refresh_token;
        await this.storeAuthData();
      } else {
        await this.logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
    }
  }

  private isTokenExpired(): boolean {
    if (!this.authStatus.accessToken) return true;

    try {
      const payload = JSON.parse(atob(this.authStatus.accessToken.split('.')[1]));
      const expiry = payload.exp * 1000;
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  }

  private async storeAuthData(): Promise<void> {
    await chrome.storage.session.set({ auth: this.authStatus });
  }
}