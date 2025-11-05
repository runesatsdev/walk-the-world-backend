import { ApiService, FeedbackTask, FeedbackSubmission } from './api';

export class FeedbackService {
  private static instance: FeedbackService;
  private apiService: ApiService;
  private lastTaskTime: number = 0;
  private completedTasks: Set<string> = new Set();

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async initialize(): Promise<void> {
    // Load completed tasks from storage
    const stored = await chrome.storage.local.get(['completedTasks', 'lastTaskTime']);
    this.completedTasks = new Set(stored.completedTasks || []);
    this.lastTaskTime = stored.lastTaskTime || 0;
  }

  async getNextTask(): Promise<FeedbackTask | null> {
    // Check if we should show a task (randomized cadence)
    if (!this.shouldShowTask()) {
      return null;
    }

    const task = await this.apiService.getNextFeedbackTask();
    if (task && !this.completedTasks.has(task.id)) {
      return task;
    }

    return null;
  }

  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; reward?: number }> {
    try {
      const result = await this.apiService.submitFeedback(feedback);

      if (result.success) {
        // Mark task as completed
        this.completedTasks.add(feedback.taskId);
        this.lastTaskTime = Date.now();

        // Save to storage
        await chrome.storage.local.set({
          completedTasks: Array.from(this.completedTasks),
          lastTaskTime: this.lastTaskTime
        });

        // Show reward notification
        if (result.reward && result.reward > 0) {
          await this.showRewardNotification(result.reward);
        }
      }

      return result;
    } catch (error) {
      console.error('Feedback submission failed:', error);
      throw error;
    }
  }

  private shouldShowTask(): boolean {
    const now = Date.now();
    const timeSinceLastTask = now - this.lastTaskTime;

    // Minimum 5 minutes between tasks
    if (timeSinceLastTask < 5 * 60 * 1000) {
      return false;
    }

    // Randomized probability that increases over time
    const hoursSinceLastTask = timeSinceLastTask / (60 * 60 * 1000);
    const baseProbability = 0.1; // 10% base chance
    const timeMultiplier = Math.min(hoursSinceLastTask / 2, 1); // Increases over 2 hours

    const probability = baseProbability + (timeMultiplier * 0.3); // Max 40% chance

    return Math.random() < probability;
  }

  private async showRewardNotification(amount: number): Promise<void> {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon128.png'),
      title: 'Xeet Reward Earned!',
      message: `+${amount} Xeets added • Thanks for helping improve signals`
    });
  }

  // Clean up old completed tasks (keep last 24 hours)
  async cleanupOldTasks(): Promise<void> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTasks = Array.from(this.completedTasks).filter(taskId => {
      // For simplicity, we'll clean up based on a time heuristic
      // In a real implementation, you'd store timestamps per task
      return true; // Keep all for now, implement proper cleanup later
    });

    this.completedTasks = new Set(recentTasks);
    await chrome.storage.local.set({ completedTasks: recentTasks });
  }
}