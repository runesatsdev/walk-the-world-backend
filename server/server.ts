import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { PrivyClient } from '@privy-io/server-auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        token: string;
        claims: any;
      };
    }
  }
}

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true // Allow credentials (cookies)
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));

// Initialize Privy client
const privy = new PrivyClient(
  process.env.PRIVY_APP_ID || 'your-privy-app-id',
  process.env.PRIVY_APP_SECRET || 'your-privy-app-secret'
);

// Types
interface TaskData {
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

interface FeedbackEntry {
  id: string;
  userId: string;
  taskId: string;
  ratings: {
    signalStrength: number;
    authenticity: number;
    sentiment: string;
  };
  comment: string;
  timestamp: string;
}

interface Reward {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: string;
  claimed?: boolean;
}

interface UserRewards {
  userId: string;
  totalAccumulated: number;
  dailyEarned: { [date: string]: number }; // date in YYYY-MM-DD
  lastRewardDate: string | null; // YYYY-MM-DD
  currentStreak: number;
  dailyCap: number;
}

interface Report {
  id: string;
  reporterId: string;
  targetUserId: string;
  tweetId: string | null;
  reason: string;
  customNote: string | null;
  screenshot?: string;
  timestamp: string;
}

interface SpaceTrackingEntry {
  id: string;
  userId: string;
  spaceId: string;
  title: string;
  host: string;
  // hostUsername: string;
  // spacelink: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  rewardAmount: number;
  timestamp: string;
}

// Authentication middleware
const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Extract Privy token from headers
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // `privy` refers to an instance of the `PrivyClient`
    const verifiedClaims = await privy.verifyAuthToken(authToken);

    // Token is valid, store user info
    req.user = {
      userId: verifiedClaims.userId,
      token: authToken,
      claims: verifiedClaims
    };

    next();
  } catch (error) {
    console.log(`Token verification failed with error ${error}.`);
    return res.status(403).json({ error: 'Invalid access token' });
  }
};

// Mock data storage (in production, use a database)
let users: any = {};
let feedback: FeedbackEntry[] = [];
let reports: Report[] = [];
let rewards: Reward[] = [];
let spaceTracking: SpaceTrackingEntry[] = [];
let userRewards: { [userId: string]: UserRewards } = {};

// Mock signals data (candidate posts/accounts for feedback)
const mockSignals = [
  {
    id: "1986975980678725634",
    type: 'post',
    name: "Josh Ong",
    username: "beijingdou",
    profilePictureUrl: "https://pbs.twimg.com/profile_images/1602122467002155010/MI7V7cqu.png",
    content: "This is a sample tweet contentalsdfkljsadhfkljasjkldfhklj;wehfj;hwae;jkfhajk;lsefh;laksdhfkj;lsdhjkfhwuiefakljshdfjkhasdiufaweflkjashdljkfashdiuhwaekjfhl.",
    tweetlink: "https://x.com/i/web/status/1986975980678725634",
    timestamp: "2025-11-08T14:00:00Z",
    replies: 12,
    reposts: 45,
    likes: 123,
    views: 2456,
  },
  {
    id: "44196397",
    type: 'account',
    name: "Elon Musk",
    username: "elonmusk",
    profilePictureUrl: "https://pbs.twimg.com/profile_images/1983681414370619392/oTT3nm5Z_400x400.jpg",
    bio: "Mars & Cars & Energy & Comedy",
    accountlink: "https://x.com/elonmusk",
    joinedDate: "2009-06-02",
    followers: 128000000,
    following: 128,
    tweets: 25000,
  }
];

// Mock configuration
const config = {
  dailyRewardCap: 100,
  feedbackPromptCadence: 3600000, // 1 hour in ms
  spaceMinDuration: 600000, // 10 minutes in ms
  rewardProbabilities: {
    feedback: 0.3,
    space: 0.5,
    report: 0.1
  }
};

// Helper functions
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getUserRewards(userId: string): UserRewards {
  if (!userRewards[userId]) {
    userRewards[userId] = {
      userId,
      totalAccumulated: 0,
      dailyEarned: {},
      lastRewardDate: null,
      currentStreak: 0,
      dailyCap: config.dailyRewardCap
    };
  }
  return userRewards[userId];
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) / 2147483647; // Normalize to 0-1
}

function shouldGrantReward(userId: string, taskType: string, date: string): boolean {
  const seed = `${userId}-${taskType}-${date}`;
  const random = seededRandom(seed);
  const probability = config.rewardProbabilities[taskType as keyof typeof config.rewardProbabilities] || 0;
  return random < probability;
}

function updateUserRewards(userId: string, amount: number, date: string) {
  const userReward = getUserRewards(userId);
  userReward.totalAccumulated += amount;
  userReward.dailyEarned[date] = (userReward.dailyEarned[date] || 0) + amount;

  // Update streak
  if (userReward.lastRewardDate) {
    const lastDate = new Date(userReward.lastRewardDate);
    const currentDate = new Date(date);
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    if (diffDays === 1) {
      userReward.currentStreak += 1;
    } else if (diffDays > 1) {
      userReward.currentStreak = 1;
    }
  } else {
    userReward.currentStreak = 1;
  }
  userReward.lastRewardDate = date;
}

// API Endpoints

// GET /api/v1/signals/*
app.get('/api/v1/signals/*', (req: express.Request, res: express.Response) => {
  // Extract the signal ID from the URL
  const signalId = req.params[0]; // '*' captures everything after /signals/

  if (signalId) {
    // Return specific signal if ID provided
    const signal = mockSignals.find(s => s.id === signalId);
    if (signal) {
      return res.json(signal);
    } else {
      return res.status(404).json({ error: 'Signal not found' });
    }
  } else {
    // Return random signal for feedback tasks
    const randomSignal = mockSignals[Math.floor(Math.random() * mockSignals.length)];
    return res.json(randomSignal);
  }
});

// GET /api/v1/extension/config
app.get('/api/v1/extension/config', (req: express.Request, res: express.Response) => {
  res.json(config);
});

// POST /api/v1/auth/token (mock token endpoint)
app.post('/api/v1/auth/token', (req: express.Request, res: express.Response) => {
  // In production, this would validate credentials and return a real JWT
  // For now, return a mock token
  const mockToken = 'real_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  res.json({
    access_token: mockToken,
    token_type: 'Bearer',
    expires_in: 3600, // 1 hour
    user_id: 'user_' + Date.now()
  });
});

// GET /api/v1/extension/tasks/next
app.get('/api/v1/extension/tasks/next', authenticateToken, (req: express.Request, res: express.Response) => {
  const userId = req.user!.userId; // Use authenticated user ID

  // Get random signal for feedback task
  const randomSignal = mockSignals[Math.floor(Math.random() * mockSignals.length)];

  // Return a different signal if user recently rated this one
  const availableSignals = mockSignals.filter(s => s.id !== randomSignal.id);
  if (availableSignals.length > 0) {
    const alternativeSignal = availableSignals[Math.floor(Math.random() * availableSignals.length)];
    return res.json({
      id: `task_${alternativeSignal.id}`,
      type: 'feedback',
      data: alternativeSignal
    });
  }

  console.log("Returning signal:", randomSignal);

  // Return feedback task with signal data
  res.json({
    id: `task_${randomSignal.id}`,
    type: 'feedback',
    data: randomSignal
  });
});

// POST /api/v1/extension/feedback
app.post('/api/v1/extension/feedback', authenticateToken, (req: express.Request, res: express.Response) => {
  const { taskId, ratings, comment } = req.body;
  const userId = req.user!.userId; // Use authenticated user ID

  if (!taskId || !ratings) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate ratings structure (signal strength 1-5, authenticity 1-5, sentiment)
  if (!ratings.signalStrength || !ratings.authenticity || !ratings.sentiment) {
    return res.status(400).json({ error: 'Ratings must include signalStrength (1-5), authenticity (1-5), and sentiment' });
  }

  if (ratings.signalStrength < 1 || ratings.signalStrength > 5 ||
    ratings.authenticity < 1 || ratings.authenticity > 5) {
    return res.status(400).json({ error: 'Signal strength and authenticity must be between 1 and 5' });
  }

  if (comment && comment.length > 280) {
    return res.status(400).json({ error: 'Comment must be 280 characters or less' });
  }

  const feedbackEntry: FeedbackEntry = {
    id: uuidv4(),
    userId,
    taskId,
    ratings,
    comment: comment || '',
    timestamp: new Date().toISOString()
  };
  console.log("New feedback submitted:", feedbackEntry);

  feedback.push(feedbackEntry);

  // Updated reward logic with daily cap and pseudo-random
  const today = getTodayDate();
  const userReward = getUserRewards(userId);
  const dailyEarned = userReward.dailyEarned[today] || 0;

  let rewardGranted = false;
  let rewardAmount = 0;

  if (dailyEarned < userReward.dailyCap && shouldGrantReward(userId, 'feedback', today)) {
    rewardAmount = Math.floor(Math.random() * 10) + 1;
    if (dailyEarned + rewardAmount > userReward.dailyCap) {
      rewardAmount = userReward.dailyCap - dailyEarned;
    }
    if (rewardAmount > 0) {
      rewardGranted = true;
      const reward: Reward = {
        id: uuidv4(),
        userId,
        amount: rewardAmount,
        reason: 'feedback',
        timestamp: new Date().toISOString()
      };
      rewards.push(reward);
      updateUserRewards(userId, rewardAmount, today);
    }
  }

  res.json({
    success: true,
    feedbackId: feedbackEntry.id,
    rewardGranted,
    rewardAmount
  });
});

// POST /api/v1/extension/rewards/claim
app.post('/api/v1/extension/rewards/claim', authenticateToken, (req: express.Request, res: express.Response) => {
  const { rewardId } = req.body;
  const userId = req.user!.userId; // Use authenticated user ID

  console.log("reward claim request", rewards);

  if (!rewardId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const reward = rewards.find(r => r.id === rewardId && r.userId === userId);
  if (!reward) {
    return res.status(404).json({ error: 'Reward not found' });
  }

  // Mark as claimed
  reward.claimed = true;

  res.json({ success: true, amount: reward.amount });
});

// POST /api/v1/extension/reports
app.post('/api/v1/extension/reports', (req: express.Request, res: express.Response) => {
  const { reporterId, targetUserId, tweetId, reason, customNote, screenshot } = req.body;

  if (!reporterId || !targetUserId || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const report: Report = {
    id: uuidv4(),
    reporterId,
    targetUserId,
    tweetId,
    reason,
    customNote,
    screenshot: screenshot || null,
    timestamp: new Date().toISOString()
  };

  console.log("New report submitted:", report);

  reports.push(report);

  // Mock reward for reporting
  const rewardGranted = 0.05 < config.rewardProbabilities.report;
  if (rewardGranted) {
    const reward: Reward = {
      id: uuidv4(),
      userId: reporterId,
      amount: Math.floor(Math.random() * 5) + 1,
      reason: 'report',
      timestamp: new Date().toISOString()
    };
    rewards.push(reward);
  }

  res.json({
    success: true,
    reportId: report.id,
    rewardGranted,
    rewardAmount: rewardGranted ? rewards[rewards.length - 1].amount : 0
  });
});

// GET /api/v1/users/rewards
app.get('/api/v1/users/rewards', authenticateToken, (req: express.Request, res: express.Response) => {
  const userId = req.user!.userId;
  const userReward = getUserRewards(userId);
  const today = getTodayDate();
  const dailyEarned = userReward.dailyEarned[today] || 0;
  const remainingCap = userReward.dailyCap - dailyEarned;

  res.json({
    userId,
    totalAccumulated: userReward.totalAccumulated,
    dailyEarned,
    dailyCap: userReward.dailyCap,
    remainingCap,
    currentStreak: userReward.currentStreak,
    lastRewardDate: userReward.lastRewardDate
  });
});

// POST /api/v1/users/rewards
app.post('/api/v1/users/rewards', authenticateToken, (req: express.Request, res: express.Response) => {
  const { amount, reason } = req.body;
  const userId = req.user!.userId;

  if (!amount || !reason) {
    return res.status(400).json({ error: 'Missing required fields: amount, reason' });
  }

  const today = getTodayDate();
  const userReward = getUserRewards(userId);
  const dailyEarned = userReward.dailyEarned[today] || 0;

  if (dailyEarned + amount > userReward.dailyCap) {
    return res.status(400).json({ error: 'Daily cap exceeded' });
  }

  const reward: Reward = {
    id: uuidv4(),
    userId,
    amount,
    reason,
    timestamp: new Date().toISOString()
  };
  rewards.push(reward);
  updateUserRewards(userId, amount, today);

  res.json({
    success: true,
    rewardId: reward.id,
    amount,
    reason
  });
});

// POST /api/v1/extension/spaces/submit
app.post('/api/v1/extension/spaces/submit', authenticateToken, (req: express.Request, res: express.Response) => {
  const {
    spaceId,
    title,
    host,
    hostUsername,
    spacelink,
    startTime,
    endTime,
    duration,
    rewardAmount
  } = req.body;
  const userId = req.user!.userId;

  if (!spaceId || !title || !duration) {
    return res.status(400).json({ error: 'Missing required fields: spaceId, title, duration' });
  }

  // Check eligibility for grant xeet (duration >= 1 minute)
  const eligibleForGrant = duration >= 1;

  const spaceEntry: SpaceTrackingEntry = {
    id: uuidv4(),
    userId,
    spaceId,
    title,
    host: host || '',
    // hostUsername: hostUsername || '',
    // spacelink: spacelink || '',
    startTime,
    endTime,
    duration,
    rewardAmount: rewardAmount || 0,
    timestamp: new Date().toISOString()
  };

  console.log("New space tracking submitted:", spaceEntry);

  spaceTracking.push(spaceEntry);

  // Updated reward logic for eligible spaces
  let rewardGranted = false;
  let rewardAmountGranted = 0;
  if (eligibleForGrant) {
    const today = getTodayDate();
    const userReward = getUserRewards(userId);
    const dailyEarned = userReward.dailyEarned[today] || 0;

    if (dailyEarned < userReward.dailyCap && shouldGrantReward(userId, 'space', today)) {
      rewardAmountGranted = rewardAmount || Math.floor(Math.random() * 25) + 1;
      if (dailyEarned + rewardAmountGranted > userReward.dailyCap) {
        rewardAmountGranted = userReward.dailyCap - dailyEarned;
      }
      if (rewardAmountGranted > 0) {
        rewardGranted = true;
        const reward: Reward = {
          id: uuidv4(),
          userId,
          amount: rewardAmountGranted,
          reason: 'space',
          timestamp: new Date().toISOString()
        };
        rewards.push(reward);
        updateUserRewards(userId, rewardAmountGranted, today);
      }
    }
  }

  res.json({
    success: true,
    spaceTrackingId: spaceEntry.id,
    eligibleForGrant,
    rewardGranted,
    rewardAmount: rewardAmountGranted
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`XEET Extension Mockup Backend running on port ${PORT}`);
});