const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mock data storage (in production, use a database)
let users = {};
let feedback = [];
let reports = [];
let rewards = [];

// Mock signals data (candidate posts/accounts for feedback)
const mockSignals = [
  {
    id: 'signal1',
    type: 'post',
    postId: '1234567890',
    creatorId: 'creator1',
    content: 'This is a sample post about technology and innovation.',
    creatorName: 'TechInnovator',
    timestamp: '2023-10-01T10:00:00Z'
  },
  {
    id: 'signal2',
    type: 'post',
    postId: '0987654321',
    creatorId: 'creator2',
    content: 'Excited about the new AI developments in our industry!',
    creatorName: 'AIEnthusiast',
    timestamp: '2023-10-02T14:30:00Z'
  },
  {
    id: 'signal3',
    type: 'account',
    accountId: 'creator3',
    creatorName: 'ContentCreator',
    bio: 'Creating amazing content daily',
    followerCount: 50000
  },
  {
    id: 'signal4',
    type: 'post',
    postId: '1122334455',
    creatorId: 'creator4',
    content: 'Thoughts on the future of social media platforms.',
    creatorName: 'SocialMediaGuru',
    timestamp: '2023-10-03T09:15:00Z'
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

// Mock tasks
const mockTasks = [
  {
    id: 'task1',
    type: 'feedback',
    data: {
      postId: '1234567890',
      creatorId: 'creator1',
      content: 'Sample post content for rating'
    }
  },
  {
    id: 'task2',
    type: 'space',
    data: {
      spaceId: 'space123',
      title: 'Sample Space Title'
    }
  }
];

// API Endpoints

// GET /api/v1/signals/*
app.get('/api/v1/signals/*', (req, res) => {
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
app.get('/api/v1/extension/config', (req, res) => {
  res.json(config);
});

// GET /api/v1/extension/tasks/next
app.get('/api/v1/extension/tasks/next', (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  // Get random signal for feedback task
  const randomSignal = mockSignals[Math.floor(Math.random() * mockSignals.length)];

  // Check if user has already provided feedback on this signal in the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentFeedback = feedback.find(f =>
    f.userId === userId &&
    ((f.taskId === randomSignal.id) || (f.ratings && f.ratings.postId === randomSignal.postId)) &&
    new Date(f.timestamp) > twentyFourHoursAgo
  );

  if (recentFeedback) {
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
  }

  // Return feedback task with signal data
  res.json({
    id: `task_${randomSignal.id}`,
    type: 'feedback',
    data: randomSignal
  });
});

// POST /api/v1/extension/feedback
app.post('/api/v1/extension/feedback', (req, res) => {
  const { userId, taskId, ratings, comment } = req.body;

  if (!userId || !taskId || !ratings) {
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

  const feedbackEntry = {
    id: uuidv4(),
    userId,
    taskId,
    ratings,
    comment: comment || '',
    timestamp: new Date().toISOString()
  };

  feedback.push(feedbackEntry);

  // Mock reward logic
  const rewardGranted = Math.random() < config.rewardProbabilities.feedback;
  if (rewardGranted) {
    const reward = {
      id: uuidv4(),
      userId,
      amount: Math.floor(Math.random() * 10) + 1,
      reason: 'feedback',
      timestamp: new Date().toISOString()
    };
    rewards.push(reward);
  }

  res.json({
    success: true,
    feedbackId: feedbackEntry.id,
    rewardGranted,
    rewardAmount: rewardGranted ? rewards[rewards.length - 1].amount : 0
  });
});

// POST /api/v1/extension/rewards/claim
app.post('/api/v1/extension/rewards/claim', (req, res) => {
  const { userId, rewardId } = req.body;

  console.log("reward claim request", rewards);

  if (!userId || !rewardId) {
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
app.post('/api/v1/extension/reports', (req, res) => {
  const { userId, targetId, reason, note, screenshot } = req.body;

  if (!userId || !targetId || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const report = {
    id: uuidv4(),
    userId,
    targetId,
    reason,
    note: note || '',
    screenshot: screenshot || null,
    timestamp: new Date().toISOString()
  };

  reports.push(report);

  // Mock reward for reporting
  const rewardGranted = 0.05 < config.rewardProbabilities.report;
  if (rewardGranted) {
    const reward = {
      id: uuidv4(),
      userId,
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

// Start server
app.listen(PORT, () => {
  console.log(`XEET Extension Mockup Backend running on port ${PORT}`);
});