import { ApiService } from './api';

export interface TelemetryEvent {
  event: string;
  timestamp: number;
  data?: any;
  extensionVersion: string;
  userId?: string;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private apiService: ApiService;
  private eventQueue: TelemetryEvent[] = [];
  private flushInterval: number | null = null;

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async initialize(): Promise<void> {
    // Load any pending events from storage
    const stored = await chrome.storage.local.get(['telemetryQueue']);
    this.eventQueue = stored.telemetryQueue || [];

    // Start periodic flush
    this.startFlushInterval();

    // Log extension start
    await this.logEvent('extension_started');
  }

  async logEvent(event: string, data?: any): Promise<void> {
    const telemetryEvent: TelemetryEvent = {
      event,
      timestamp: Date.now(),
      data,
      extensionVersion: chrome.runtime.getManifest().version,
      // userId will be added by API service if authenticated
    };

    this.eventQueue.push(telemetryEvent);

    // Keep queue size manageable
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }

    // Save to storage
    await chrome.storage.local.set({ telemetryQueue: this.eventQueue });

    // Flush immediately for critical events
    if (this.isCriticalEvent(event)) {
      await this.flush();
    }
  }

  private isCriticalEvent(event: string): boolean {
    const criticalEvents = [
      'extension_started',
      'extension_error',
      'auth_failed',
      'api_error'
    ];
    return criticalEvents.includes(event);
  }

  private startFlushInterval(): void {
    // Flush every 5 minutes
    this.flushInterval = self.setInterval(() => {
      this.flush();
    }, 5 * 60 * 1000);
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];

    try {
      // Send events to API
      await this.apiService.logTelemetry('batch_events', { events: eventsToSend });

      // Clear sent events
      this.eventQueue = this.eventQueue.filter(event =>
        !eventsToSend.includes(event)
      );

      // Save updated queue
      await chrome.storage.local.set({ telemetryQueue: this.eventQueue });

    } catch (error) {
      console.error('Telemetry flush failed:', error);

      // Keep events for retry, but limit queue size
      if (this.eventQueue.length > 200) {
        this.eventQueue.splice(0, this.eventQueue.length - 200);
        await chrome.storage.local.set({ telemetryQueue: this.eventQueue });
      }
    }
  }

  async logError(error: Error, context?: any): Promise<void> {
    await this.logEvent('extension_error', {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  async logApiCall(endpoint: string, method: string, success: boolean, duration: number): Promise<void> {
    await this.logEvent('api_call', {
      endpoint,
      method,
      success,
      duration
    });
  }

  // Get telemetry statistics for debugging
  async getStats(): Promise<{
    queuedEvents: number;
    lastFlush: number;
    extensionVersion: string;
  }> {
    const stored = await chrome.storage.local.get(['lastFlush']);
    return {
      queuedEvents: this.eventQueue.length,
      lastFlush: stored.lastFlush || 0,
      extensionVersion: chrome.runtime.getManifest().version
    };
  }

  // Cleanup old telemetry data
  async cleanup(): Promise<void> {
    // Clear events older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.eventQueue = this.eventQueue.filter(event => event.timestamp > sevenDaysAgo);
    await chrome.storage.local.set({ telemetryQueue: this.eventQueue });
  }
}