// Background script for handling Spaces tracking and rewards
(function () {
  'use strict';

  let activeSpaces = {};
  let completedSpaces = [];

  // Load stored data
  chrome.storage.local.get(['activeSpaces', 'completedSpaces'], (result) => {
    activeSpaces = result.activeSpaces || {};
    completedSpaces = result.completedSpaces || [];
  });

  // Handle messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("message received in background.js-->>>", message);
    switch (message.type) {
      case 'SPACE_JOINED':
        handleSpaceJoined(message.data, sender);
        break;
      case 'SPACE_LEFT':
        handleSpaceLeft(message.data);
        break;
      case 'DURATION_UPDATE':
        handleDurationUpdate(message.data);
        break;
      case 'SPACE_JOIN_ATTEMPT':
        handleSpaceJoinAttempt(message.data);
        break;
      case 'OPEN_REPORT_TAB':
        openReportTab();
        break;
      case 'GET_SPACES_DATA':
        sendResponse({ activeSpaces, completedSpaces });
        break;
      case 'GET_AVAILABLE_SPACES':
        sendResponse(getAvailableSpaces());
        break;
    }
  });

  function handleSpaceJoined(spaceData, sender) {
    const [existingSpaceId] = Object.keys(activeSpaces);

    // If no active session, start a new one
    if (!existingSpaceId) return handleNewSession(spaceData, sender);

    const existingSpace = activeSpaces[existingSpaceId];
    const isDifferentSpace =
      existingSpace.title !== spaceData.title ||
      existingSpace.host !== spaceData.host;

    // If joining the same space, do nothing
    if (!isDifferentSpace) return;

    // Calculate duration and reward eligibility
    const duration = Math.floor((Date.now() - existingSpace.startTime) / 60000); // ms → minutes
    const rewardEarned = duration >= 1;

    // Create completed session record
    const completedSpace = {
      ...existingSpace,
      duration,
      rewardEarned,
      endTime: Date.now(),
    };

    // Update session records
    completedSpaces.push(completedSpace);
    delete activeSpaces[existingSpaceId];

    // Notify UI or background
    try {
      chrome.runtime
        .sendMessage({
          type: "SPACE_SESSION_UPDATE",
          data: { ...completedSpace, completed: true },
        })
        .catch(() => { });
    } catch (_) { }

    // Start new session
    handleNewSession(spaceData, sender);
  }

  function handleDurationUpdate(spaceData) {
    const spaceDuration = activeSpaces[spaceData.id];
    if (spaceDuration) {

      activeSpaces[spaceData.id] = {
        ...spaceDuration
      };

      saveSpacesData();

      chrome.runtime
        .sendMessage({
          type: "SPACE_SESSION_UPDATE",
          data: { ...spaceDuration, completed: false },
        })
        .catch(() => { });
    }
  }

  function handleNewSession(spaceData, sender) {
    // Start a new space session
    activeSpaces[spaceData.id] = {
      ...spaceData,
      startTime: spaceData.startTime,
      tabId: sender.tab.id
    };

    saveSpacesData();

    // Check if this space matches any available spaces and open popup if it does
    const availableSpaces = getAvailableSpaces();
    const matchedSpace = availableSpaces.find(space => space.title === spaceData.title);

    if (matchedSpace) {
      console.log('Matched space found, opening extension popup:', matchedSpace.title);
      // Open the extension popup
      if (chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup();
      } else {
        // Fallback for older Chrome versions
        chrome.browserAction.openPopup();
      }

      // Send message to switch to spaces tab
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'SWITCH_TO_SPACES_TAB',
          data: {
            matchedSpace: matchedSpace,
            spaceData: spaceData
          }
        }).catch(() => {
          // Ignore errors if popup is not ready yet
        });
      }, 500); // Small delay to ensure popup is open
    }

    // Notify popup about the new active session
    try {
      chrome.runtime.sendMessage({
        type: 'SPACE_SESSION_UPDATE',
        data: {
          ...spaceData,
          completed: false
        }
      }).catch(() => {
        // Ignore errors when popup is not open
      });
    } catch (error) {
      // Ignore connection errors
    }
  }

  function handleSpaceLeft(spaceData) {
    const space = activeSpaces[spaceData.id];
    if (space) {
      const completedSpace = {
        ...space,
        duration: spaceData.duration,
        rewardEarned: spaceData.rewardEarned,
        endTime: Date.now()
      };

      completedSpaces.push(completedSpace);
      delete activeSpaces[spaceData.id];

      saveSpacesData();

      // Grant reward if eligible
      if (spaceData.rewardEarned) {
        grantXeetReward(completedSpace);
      }

      // Notify popup about the update (only if popup is open)
      try {
        chrome.runtime.sendMessage({
          type: 'SPACE_SESSION_UPDATE',
          data: {
            ...completedSpace,
            completed: true
          }
        }).catch(() => {
          // Ignore errors when popup is not open
        });
      } catch (error) {
        // Ignore connection errors
      }
    }
  }

  function grantXeetReward(spaceSession) {
    // Log session metadata for reward processing
    const rewardData = {
      spaceId: spaceSession.id,
      title: spaceSession.title,
      host: spaceSession.host,
      duration: spaceSession.duration,
      startTime: new Date(spaceSession.startTime).toISOString(),
      endTime: new Date(spaceSession.endTime).toISOString(),
      rewardType: 'space_participation',
      timestamp: new Date().toISOString(),
      rewardAmount: 25 // Fixed reward amount for spaces for now
    };

    console.log('Granting Xeet reward for space session:', rewardData);

    // Store reward metadata locally
    chrome.storage.local.get(['rewardHistory'], (result) => {
      const history = result.rewardHistory || [];
      history.push(rewardData);
      chrome.storage.local.set({ rewardHistory: history.slice(-100) }); // Keep last 100 rewards
    });

    // In production, send to server:
    // fetch('https://api.xeet.com/v1/rewards/spaces', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': 'Bearer ' + getAuthToken()
    //   },
    //   body: JSON.stringify(rewardData)
    // }).then(response => {
    //   if (response.ok) {
    //     console.log('Reward granted successfully');
    //   }
    // }).catch(error => {
    //   console.error('Failed to grant reward:', error);
    // });
  }

  function openReportTab() {
    // Open the extension popup focused on the report tab
    chrome.windows.create({
      url: chrome.runtime.getURL('index.html#report'),
      type: 'popup',
      width: 400,
      height: 600
    });
  }

  function saveSpacesData() {
    chrome.storage.local.set({
      activeSpaces: activeSpaces,
      completedSpaces: completedSpaces.slice(-100) // Keep last 100 completed sessions
    });
  }

  // Clean up inactive spaces on extension startup
  function cleanupInactiveSpaces() {
    const now = Date.now();
    const timeoutMs = 30 * 60 * 1000; // 30 minutes timeout

    Object.keys(activeSpaces).forEach(spaceId => {
      const space = activeSpaces[spaceId];
      if (now - space.startTime > timeoutMs) {
        // Mark as completed with no reward (timed out)
        const completedSpace = {
          ...space,
          duration: Math.floor((now - space.startTime) / (1000 * 60)),
          rewardEarned: false,
          endTime: new Date()
        };

        completedSpaces.push(completedSpace);
        delete activeSpaces[spaceId];
      }
    });

    saveSpacesData();
  }

  // Run cleanup on startup
  cleanupInactiveSpaces();

  // Periodic cleanup every 5 minutes
  setInterval(cleanupInactiveSpaces, 5 * 60 * 1000);

  function handleSpaceJoinAttempt(data) {
    console.log('Space join attempt:', data);
    // Store join attempt for tracking
    chrome.storage.local.get(['joinAttempts'], (result) => {
      const attempts = result.joinAttempts || [];
      attempts.push({
        ...data,
        userId: 'current_user' // In production, get from auth
      });
      chrome.storage.local.set({ joinAttempts: attempts.slice(-50) }); // Keep last 50
    });
  }

  function getAvailableSpaces() {
    // In production, this would fetch from API
    // For now, return mock data that matches the UI
    return [
      {
        id: "1mnxeNVXrYvKX",
        title: "STATE OF TYPE 🚨 EP. 346",
        host: "Tex",
        hostUsername: "TexSlays",
        hostProfilePictureUrl: "https://pbs.twimg.com/profile_images/1602122467002155010/MI7V7cqu.png",
        spacelink: "https://x.com/i/spaces/1mnxeNVXrYvKX/peek?s=20",
        description: "Join us for an in-depth discussion about the latest developments in Web3 and DeFi protocols. We'll cover DeFi yields, NFT markets, and blockchain scalability solutions.",
        participantCount: 1250,
        startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        estimatedDuration: 60,
        rewardAmount: 25,
        isLive: true,
        category: "Technology",
        language: "English",
        tags: ["Web3", "DeFi", "Blockchain", "Crypto"]
      },
      {
        id: "space_002",
        title: "AI & Machine Learning Today",
        host: "AIPioneer",
        hostUsername: "ai_pioneer",
        hostProfilePictureUrl: "https://pbs.twimg.com/profile_images/1983681414370619392/oTT3nm5Z_400x400.jpg",
        spacelink: "https://x.com/i/spaces/1RDxlBvXaMXKm/peek?s=20",
        description: "Exploring the cutting-edge developments in artificial intelligence and machine learning. From GPT-4 advancements to practical ML applications in business.",
        participantCount: 890,
        startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        estimatedDuration: 45,
        rewardAmount: 20,
        isLive: true,
        category: "Technology",
        language: "English",
        tags: ["AI", "Machine Learning", "GPT", "Innovation"]
      },
      {
        id: "space_003",
        title: "Startup Funding Strategies",
        host: "VentureBuilder",
        hostUsername: "venture_builder",
        hostProfilePictureUrl: "https://pbs.twimg.com/profile_images/1602122467002155010/MI7V7cqu.png",
        spacelink: "https://x.com/i/spaces/1RDxlBvXaMXKm",
        description: "Learn from successful entrepreneurs about raising capital, pitch decks, and navigating the startup ecosystem. Real stories and practical advice.",
        participantCount: 675,
        startedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
        estimatedDuration: 50,
        rewardAmount: 18,
        isLive: true,
        category: "Business",
        language: "English",
        tags: ["Startups", "Funding", "Entrepreneurship", "Venture Capital"]
      },
      {
        id: "space_004",
        title: "Climate Tech Innovation",
        host: "GreenTechLeader",
        hostUsername: "green_tech",
        hostProfilePictureUrl: "https://pbs.twimg.com/profile_images/1983681414370619392/oTT3nm5Z_400x400.jpg",
        spacelink: "https://x.com/i/spaces/1RDxlBvXaMXKm",
        description: "Discussing breakthrough technologies in renewable energy, carbon capture, and sustainable solutions for climate change.",
        participantCount: 543,
        startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        estimatedDuration: 40,
        rewardAmount: 15,
        isLive: true,
        category: "Environment",
        language: "English",
        tags: ["Climate", "Renewable Energy", "Sustainability", "Innovation"]
      },
      {
        id: "space_005",
        title: "Remote Work Culture",
        host: "WorkLifeBalance",
        hostUsername: "work_balance",
        hostProfilePictureUrl: "https://pbs.twimg.com/profile_images/1602122467002155010/MI7V7cqu.png",
        spacelink: "https://x.com/i/spaces/1RDxlBvXaMXKm",
        description: "Exploring the future of work, remote team management, and building strong company culture in distributed environments.",
        participantCount: 432,
        startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        estimatedDuration: 35,
        rewardAmount: 12,
        isLive: true,
        category: "Business",
        language: "English",
        tags: ["Remote Work", "Culture", "Management", "Future of Work"]
      }
    ];
  }
})();