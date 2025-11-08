// Background script for handling Spaces tracking and rewards
(function() {
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
    switch (message.type) {
      case 'SPACE_JOINED':
        handleSpaceJoined(message.data);
        break;
      case 'SPACE_LEFT':
        handleSpaceLeft(message.data);
        break;
      case 'OPEN_REPORT_TAB':
        openReportTab();
        break;
      case 'GET_SPACES_DATA':
        sendResponse({ activeSpaces, completedSpaces });
        break;
    }
  });

  function handleSpaceJoined(spaceData) {
    activeSpaces[spaceData.id] = {
      ...spaceData,
      startTime: new Date(spaceData.startTime),
      tabId: sender.tab.id
    };

    saveSpacesData();

    // Notify popup about the update
    chrome.runtime.sendMessage({
      type: 'SPACE_SESSION_UPDATE',
      data: {
        ...spaceData,
        completed: false
      }
    });
  }

  function handleSpaceLeft(spaceData) {
    const space = activeSpaces[spaceData.id];
    if (space) {
      const completedSpace = {
        ...space,
        duration: spaceData.duration,
        rewardEarned: spaceData.rewardEarned,
        endTime: new Date()
      };

      completedSpaces.push(completedSpace);
      delete activeSpaces[spaceData.id];

      saveSpacesData();

      // Grant reward if eligible
      if (spaceData.rewardEarned) {
        grantSeetReward(completedSpace);
      }

      // Notify popup about the update
      chrome.runtime.sendMessage({
        type: 'SPACE_SESSION_UPDATE',
        data: {
          ...completedSpace,
          completed: true
        }
      });
    }
  }

  function grantSeetReward(spaceSession) {
    // In a real implementation, this would call the seet API
    console.log('Granting seet reward for space session:', spaceSession);

    // For now, just log it. In production:
    // fetch('/api/v1/rewards/spaces', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     spaceId: spaceSession.id,
    //     duration: spaceSession.duration,
    //     timestamp: spaceSession.endTime.toISOString()
    //   })
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
      if (now - space.startTime.getTime() > timeoutMs) {
        // Mark as completed with no reward (timed out)
        const completedSpace = {
          ...space,
          duration: Math.floor((now - space.startTime.getTime()) / (1000 * 60)),
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
})();