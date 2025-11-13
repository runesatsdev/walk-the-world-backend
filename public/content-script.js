// Content script for X.com/Twitter.com
// Handles both Space tracking and page data extraction
// This runs in the context of web pages

// ===== SPACE TRACKING FUNCTIONALITY =====
(function () {
  'use strict';

  let currentSpaceSession = null;
  let sessionStartTime = null;
  let mutationObserver = null;
  const MIN_DURATION_MINUTES = 1; // Minimum duration for reward

  // Function to extract text content including emoji alt text
  function extractTextWithEmojis(element) {
    if (!element) return '';

    let text = '';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
        const alt = node.getAttribute('alt');
        if (alt) {
          text += alt;
        }
      }
    }

    return text.trim();
  }

  // Function to detect if we're in a Space
  function detectSpace() {
    // Specific selectors based on actual X Spaces DOM structure
    const spaceDockExpanded = document.querySelector('[data-testid="SpaceDockExpanded"]');
    const spaceDock = document.querySelector('[data-testid="SpaceDock"]');
    const recIndicator = document.querySelector('[aria-label="Recording active"]');
    const spaceTitleElement = document.querySelector('[data-testid="tweetText"]');

    let spaceFound = false;
    let spaceTitle = null;
    let spaceHost = null;

    // Primary detection: SpaceDockExpanded indicates we're in a space
    if (spaceDock || spaceDockExpanded) {
      spaceFound = true;
      console.log('Space detected via SpaceDockExpanded');

      // Extract title from tweetText including emojis
      if (spaceTitleElement) {
        spaceTitle = extractTextWithEmojis(spaceTitleElement);
      }

      // Extract host using enhanced logic
      spaceHost = extractHost();
      console.log('Extracted host:', spaceHost);
    }

    // Additional confirmation: Leave button indicates active participation
    const allSpans = document.querySelectorAll('span');
    let leaveButtonFound = false;
    for (const span of allSpans) {
      if (span.textContent?.trim() === 'Leave') {
        const button = span.closest('button');
        if (button) {
          leaveButtonFound = true;
          break;
        }
      }
    }

    // Alternative: Check for button with specific styling that contains Leave text
    if (!leaveButtonFound) {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent?.includes('Leave') || button.innerText?.includes('Leave')) {
          leaveButtonFound = true;
          break;
        }
      }
    }

    // Use Leave button as primary detection if SpaceDock not found
    if (!spaceFound && leaveButtonFound) {
      spaceFound = true;
      console.log('Space detected via Leave button');

      // Extract title from tweetText including emojis
      if (spaceTitleElement) {
        spaceTitle = extractTextWithEmojis(spaceTitleElement);
      }

      // Extract host using enhanced logic
      spaceHost = extractHost();
      console.log('Extracted host:', spaceHost);
    }

    // Recording indicator as additional confirmation
    if (!spaceFound && recIndicator) {
      spaceFound = true;
      console.log('Space detected via Recording indicator');
      spaceTitle = extractTextWithEmojis(spaceTitleElement) || 'Unknown Space';
      spaceHost = extractHost();
    }

    // Check shadow DOM as last resort
    if (!spaceFound) {
      const shadowHosts = document.querySelectorAll('*');
      for (const host of shadowHosts) {
        if (host.shadowRoot) {
          const shadowSpaceDockExpanded = host.shadowRoot.querySelector('[data-testid="SpaceDockExpanded"]');
          const shadowSpaceDock = host.shadowRoot.querySelector('[data-testid="SpaceDock"]');
          if (shadowSpaceDock || shadowSpaceDockExpanded) {
            spaceFound = true;
            console.log('Space detected in shadow DOM');
            const shadowTitle = host.shadowRoot.querySelector('[data-testid="tweetText"]');
            spaceTitle = extractTextWithEmojis(shadowTitle) || 'Unknown Space';
            spaceHost = extractHost();
            break;
          }
        }
      }
    }

    if (spaceFound) {
      const spaceId = extractSpaceId();
      const title = spaceTitle || 'Unknown Space';
      const host = spaceHost || extractHost();

      if (!currentSpaceSession || currentSpaceSession.title !== title) {
        startSpaceSession(spaceId, title, host);
      } else {
        const sessionData = {
          ...currentSpaceSession,
          duration: Math.floor((Date.now() - sessionStartTime) / 1000) // in seconds
        }

        try {
          chrome.runtime.sendMessage({
            type: 'DURATION_UPDATE',
            data: sessionData
          });
        } catch (error) {
          console.log('Failed to send message to background script:', error);
        }
      }
    } else if (currentSpaceSession) {
      endSpaceSession();
    }
  }

  function extractSpaceId() {
    const url = window.location.href;
    const spaceMatch = url.match(/\/i\/spaces\/([^/?]+)/);
    return spaceMatch ? spaceMatch[1] : Date.now().toString();
  }

  function extractHost() {
    // Look for the specific DOM structure with "Host" label and user info
    const hostLabelSpans = document.querySelectorAll('span');
    for (const span of hostLabelSpans) {
      if (span.textContent?.trim() === 'Host') {
        const hostContainer = span.closest('div[class*="r-1awozwy r-18u37iz r-1777fci r-bnwqim"]');
        if (hostContainer) {
          const userInfoContainer = hostContainer.previousElementSibling ||
            hostContainer.parentElement?.previousElementSibling;

          if (userInfoContainer) {
            const userNameSpans = userInfoContainer.querySelectorAll('span');
            for (const nameSpan of userNameSpans) {
              const text = nameSpan.textContent?.trim();
              if (text && text.length > 0 && text !== 'Host' && !text.includes('Verified account')) {
                const directChildSpans = Array.from(nameSpan.children).filter(child => child.tagName === 'SPAN');
                if (directChildSpans.length > 1) {
                  const fullText = directChildSpans
                    .map(span => span.textContent?.trim() || '')
                    .join('')
                    .trim();
                  if (fullText && fullText.length > 0) {
                    const cleanName = fullText.replace(/\s+/g, ' ').trim();
                    console.log('Extracted host name from direct child spans:', cleanName);
                    return cleanName;
                  }
                } else if (directChildSpans.length === 1) {
                  const childText = directChildSpans[0].textContent?.trim();
                  if (childText && childText.length > 0) {
                    console.log('Extracted host name from single child span:', childText);
                    return childText;
                  }
                } else {
                  const cleanName = text.split(' ')[0].replace(/[^\w\s@]/g, '').trim();
                  if (cleanName && cleanName.length > 0) {
                    console.log('Extracted host name from span text:', cleanName);
                    return cleanName;
                  }
                }
              }
            }

            const userLink = userInfoContainer.querySelector('a[href*="/"]');
            if (userLink) {
              const username = userLink.getAttribute('href')?.split('/').pop();
              if (username && username !== 'home') {
                console.log('Extracted host name from link:', username);
                return username;
              }
            }
          }
        }
      }
    }

    // Fallback methods
    const hostSelectors = [
      '[data-testid="space-host"]',
      '[data-testid="SpaceHost"]',
      '[role="link"][href*="/"]',
      '[data-testid*="host"]',
      '.space-host',
      '[aria-label*="host"]'
    ];

    for (const selector of hostSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        const href = element.getAttribute('href');
        if (text && text !== 'Host') {
          return text;
        }
        if (href) {
          const username = href.split('/').pop();
          if (username && username !== 'home') {
            return username;
          }
        }
      }
    }

    const allElements = document.querySelectorAll('[data-testid*="UserAvatar"], a[href*="/"]');
    for (const element of allElements) {
      const href = element.getAttribute('href');
      if (href && href.startsWith('/')) {
        const username = href.split('/').pop();
        if (username && username !== 'home' && username.length > 0) {
          console.log('Extracted host name from fallback:', username);
          return username;
        }
      }
    }

    console.log('Could not extract host name from DOM');
    return 'Unknown';
  }

  function startSpaceSession(spaceId, title, host) {
    if (currentSpaceSession && currentSpaceSession.title !== title) {
      endSpaceSession();
    }

    currentSpaceSession = {
      id: spaceId,
      title: title,
      host: host,
      startTime: new Date().toISOString()
    };

    sessionStartTime = Date.now();

    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'SPACE_JOINED',
          data: currentSpaceSession
        });
      } catch (error) {
        console.log('Failed to send message to background script:', error);
      }
    } else {
      console.log('Chrome extension APIs not available or incorrect extension ID, running in standalone mode');
    }

    console.log('Joined Space:', currentSpaceSession);
  }

  function endSpaceSession() {
    if (currentSpaceSession && sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime) / (1000 * 60)); // in minutes
      const rewardEarned = duration >= MIN_DURATION_MINUTES;

      const sessionData = {
        ...currentSpaceSession,
        duration: duration,
        rewardEarned: rewardEarned,
        completed: true
      };

      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            type: 'SPACE_LEFT',
            data: sessionData
          });
        } catch (error) {
          console.log('Failed to send message to background script:', error);
        }
      } else {
        console.log('Chrome extension APIs not available or incorrect extension ID, running in standalone mode');
      }

      console.log('Left Space:', sessionData);
    }

    currentSpaceSession = null;
    sessionStartTime = null;
  }

  // Initialize space tracking
  function initSpaceTracking() {
    detectSpace();
    initMutationObserver();
    setInterval(detectSpace, 10000); // Check every 10 seconds as fallback

    // Listen for page navigation
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          initMutationObserver();
          detectSpace();
        }, 2000);
      }
    }, 1000);
  }

  function initMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.matches && (element.matches('[data-testid*="space"], [data-testid*="Space"]') ||
                element.querySelector('[data-testid*="space"], [data-testid*="Space"]'))) {
                shouldCheck = true;
                break;
              }
            }
          }
        } else if (mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-testid' || mutation.attributeName === 'aria-label')) {
          shouldCheck = true;
        }
        if (shouldCheck) break;
      }

      if (shouldCheck) {
        clearTimeout(window.spaceDetectionTimeout);
        window.spaceDetectionTimeout = setTimeout(detectSpace, 500);
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-testid', 'aria-label', 'role']
    });
  }

  // ===== PAGE DATA EXTRACTION FUNCTIONALITY =====

function extractPageData() {
  try {
    // Check if we're on a Twitter/X page
    if (!window.location.hostname.includes('x.com') &&
        !window.location.hostname.includes('twitter.com')) {
      return null;
    }

    const data = {
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Extract user profile data
    const userNameElement = document.querySelector('[data-testid="User-Name"]');
    if (userNameElement) {
      data.userName = userNameElement.textContent?.trim();
    }

    const userHandleElement = document.querySelector('[role="link"][href*="/"]');
    if (userHandleElement?.href) {
      const handle = userHandleElement.href.split('/').pop();
      if (handle && !handle.includes('status')) {
        data.userHandle = handle;
      }
    }

    // Extract follower/following counts using specific link selectors
    const followingLink = document.querySelector('a[href*="/following"]');
    if (followingLink) {
      const followingText = followingLink.textContent || '';
      // Extract number from spans within the link
      const numberSpans = followingLink.querySelectorAll('span');
      for (const span of numberSpans) {
        const spanText = span.textContent?.trim() || '';
        if (spanText && /^\d+(\.\d+)?[KMB]?$/i.test(spanText)) {
          data.following = parseCount(spanText);
          break;
        }
      }
    }

    const followersLink = document.querySelector('a[href*="/verified_followers"]');
    if (followersLink) {
      const followersText = followersLink.textContent || '';
      // Extract number from spans within the link
      const numberSpans = followersLink.querySelectorAll('span');
      for (const span of numberSpans) {
        const spanText = span.textContent?.trim() || '';
        if (spanText && /^\d+(\.\d+)?[KMB]?$/i.test(spanText)) {
          data.followers = parseCount(spanText);
          break;
        }
      }
    }

    // Extract post metrics (likes, reposts, etc.)
    const metrics = {};

    // Like count
    const likeButton = document.querySelector('[data-testid*="like"]');
    if (likeButton) {
      const ariaLabel = likeButton.getAttribute('aria-label') || '';
      const match = ariaLabel.match(/(\d+(?:\.\d+)?[KMB]?)/);
      if (match) {
        metrics.likes = parseCount(match[1]);
      }
    }

    // Repost count
    const repostButton = document.querySelector('[data-testid*="retweet"]');
    if (repostButton) {
      const ariaLabel = repostButton.getAttribute('aria-label') || '';
      const match = ariaLabel.match(/(\d+(?:\.\d+)?[KMB]?)/);
      if (match) {
        metrics.reposts = parseCount(match[1]);
      }
    }

    // Reply count
    const replyButton = document.querySelector('[data-testid*="reply"]');
    if (replyButton) {
      const ariaLabel = replyButton.getAttribute('aria-label') || '';
      const match = ariaLabel.match(/(\d+(?:\.\d+)?[KMB]?)/);
      if (match) {
        metrics.replies = parseCount(match[1]);
      }
    }

    // View count
    const viewElement = document.querySelector('[data-testid*="view"]');
    if (viewElement) {
      const ariaLabel = viewElement.getAttribute('aria-label') || '';
      const match = ariaLabel.match(/(\d+(?:\.\d+)?[KMB]?)/);
      if (match) {
        metrics.views = parseCount(match[1]);
      }
    }

    if (Object.keys(metrics).length > 0) {
      data.postMetrics = metrics;
    }

    // Extract profile image
    const profileImg = document.querySelector('article img[alt*="profile"]') ||
                      document.querySelector('[data-testid="Tweet-User-Avatar"] img') ||
                      document.querySelector('[data-testid="User-Profile-Avatar"] img');

    if (profileImg?.src) {
      data.profileImage = profileImg.src;
    }

    return data;
  } catch (error) {
    console.error('Error extracting page data:', error);
    return null;
  }
}

function parseCount(text) {
  if (!text) return 0;

  // Remove commas and handle K/M/B suffixes
  const cleaned = text.replace(/,/g, '').toUpperCase();

  if (cleaned.endsWith('K')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000);
  } else if (cleaned.endsWith('M')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000);
  } else if (cleaned.endsWith('B')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000000);
  }

  return parseInt(cleaned) || 0;
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_PAGE_DATA') {
    const data = extractPageData();
    sendResponse({ data });
  }
});

// Also send data proactively when DOM changes (for dynamic content)
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Page changed, could send update if needed
  }
}).observe(document.body, { childList: true, subtree: true });

// ===== INITIALIZATION =====

// Initialize both functionalities
function init() {
  // Initialize space tracking
  initSpaceTracking();

  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PAGE_DATA') {
      const data = extractPageData();
      sendResponse({ data });
    }
  });

  // Listen for report button clicks
  window.addEventListener('message', (event) => {
    if (event.data.type === 'XEET_REPORT_CLICK') {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            type: 'OPEN_REPORT_TAB'
          });
        } catch (error) {
          console.log('Failed to send report message:', error);
        }
      } else {
        console.log('Chrome extension APIs not available or incorrect extension ID, cannot open report tab');
      }
    }
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  if (currentSpaceSession) {
    endSpaceSession();
  }
});

})();