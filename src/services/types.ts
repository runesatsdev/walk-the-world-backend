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
