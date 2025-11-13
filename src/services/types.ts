// Types for API responses
export interface TaskData {
  id: string;
  type: 'feedback';
  data: {
    id: string;
    type: 'post' | 'account';
    name: string;
    username: string;
    profilePictureUrl: string;
    content?: string;
    tweetlink?: string;
    timestamp?: string;
    replies?: number;
    reposts?: number;
    likes?: number;
    views?: number;
    bio?: string;
    accountlink?: string;
    joinedDate?: string;
    followers?: number;
    following?: number;
    tweets?: number;
  };
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId: string;
  rewardGranted: boolean;
  rewardAmount: number;
}

export interface ClaimResponse {
  success: boolean;
  amount: number;
}

export interface AdminReportRequest {
  reason: string;
  customNote?: string;
  targetUserId?: string;
  tweetId?: string;
  currentMetrics?: {
    accountDetails?: any;
    postMetrics?: any;
  };
  reporterId: string;
  timestamp: string;
  screenshot?: string;
  url: string;
}

export interface AdminReportResponse {
  success: boolean;
  reportId: string;
  message: string;
}
