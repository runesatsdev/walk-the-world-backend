// Content script for X.com to detect Spaces and enable reporting
(function () {
  'use strict';

  let currentSpaceSession = null;
  let sessionStartTime = null;
  let mutationObserver = null;
  const MIN_DURATION_MINUTES = 5; // Minimum duration for reward

  // Function to detect if we're in a Space
  function detectSpace() {
    // Specific selectors based on actual X Spaces DOM structure
    const spaceDockExpanded = document.querySelector('[data-testid="SpaceDockExpanded"]');
    const spaceDock = document.querySelector('[data-testid="SpaceDock"]');
    // const leaveButton = document.querySelector('button span span span:contains("Leave")');
    const recIndicator = document.querySelector('[aria-label="Recording active"]');
    const spaceTitleElement = document.querySelector('[data-testid="tweetText"]');

    let spaceFound = false;
    let spaceTitle = null;
    let spaceHost = null;

    // Primary detection: SpaceDockExpanded indicates we're in a space
    if (spaceDock || spaceDockExpanded) {
      spaceFound = true;
      console.log('Space detected via SpaceDockExpanded');

      // Extract title from tweetText
      if (spaceTitleElement) {
        spaceTitle = spaceTitleElement.textContent?.trim();
      }

      // Extract host using enhanced logic
      spaceHost = extractHost();
      console.log('Extracted host:', spaceHost);
    }

    // Additional confirmation: Leave button indicates active participation
    // Use text content matching for the Leave button
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

    if (!spaceFound && leaveButtonFound) {
      spaceFound = true;
      console.log('Space detected via Leave button');
      spaceTitle = spaceTitleElement?.textContent?.trim() || 'Unknown Space';
      spaceHost = extractHost();
    }

    // Recording indicator as additional confirmation
    if (!spaceFound && recIndicator) {
      spaceFound = true;
      console.log('Space detected via Recording indicator');
      spaceTitle = spaceTitleElement?.textContent?.trim() || 'Unknown Space';
      spaceHost = extractHost();
    }

    // Check for other Space-related elements as fallback
    if (!spaceFound) {
      const fallbackSelectors = [
        '[data-testid*="space"]',
        '[role="group"][aria-label*="Space"]',
        '[data-testid="space-title"]',
        'h1[data-testid*="space"]',
        '[data-testid="SpacePageHeader"]',
        '[data-testid="SpaceTitle"]',
        '[data-testid="SpaceHost"]'
      ];

      for (const selector of fallbackSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          spaceFound = true;
          console.log('Space detected via fallback selector:', selector);
          if (!spaceTitle && (selector.includes('title') || selector.includes('Title'))) {
            spaceTitle = elements[0].textContent;
          }
          if (!spaceHost && (selector.includes('host') || selector.includes('Host'))) {
            spaceHost = elements[0].textContent;
          }
          break;
        }
      }
    }

    // Check shadow DOM as last resort
    if (!spaceFound) {
      const shadowHosts = document.querySelectorAll('*');
      for (const host of shadowHosts) {
        if (host.shadowRoot) {
          const shadowSpaceDock = host.shadowRoot.querySelector('[data-testid="SpaceDockExpanded"]');
          if (shadowSpaceDock) {
            spaceFound = true;
            console.log('Space detected in shadow DOM');
            const shadowTitle = host.shadowRoot.querySelector('[data-testid="tweetText"]');
            spaceTitle = shadowTitle?.textContent?.trim() || 'Unknown Space';
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

      if (!currentSpaceSession || currentSpaceSession.id !== spaceId) {
        startSpaceSession(spaceId, title, host);
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
    // Based on the provided DOM structure, find spans with "Host" text
    const hostLabelSpans = document.querySelectorAll('span');
    for (const span of hostLabelSpans) {
      if (span.textContent?.trim() === 'Host') {
        // Found the "Host" label, now look for the associated user info
        // The host name should be in a nearby container with user avatar and name
        const hostContainer = span.closest('div[class*="r-1awozwy r-18u37iz r-1777fci r-bnwqim"]');
        if (hostContainer) {
          // Look for the user name in the associated container
          // The structure has the user avatar and name in a preceding sibling or parent
          const userInfoContainer = hostContainer.previousElementSibling ||
                                   hostContainer.parentElement?.previousElementSibling;

          if (userInfoContainer) {
            // Look for spans containing the user name (typically with emoji and verification)
            const userNameSpans = userInfoContainer.querySelectorAll('span');
            for (const nameSpan of userNameSpans) {
              const text = nameSpan.textContent?.trim();
              if (text && text.length > 0 && text !== 'Host' && !text.includes('Verified account')) {
                // For spans with multiple direct child spans (like the username structure), collect only direct children
                const directChildSpans = Array.from(nameSpan.children).filter(child => child.tagName === 'SPAN');
                if (directChildSpans.length > 1) {
                  // Join only direct child span texts to avoid duplication
                  const fullText = directChildSpans
                    .map(span => span.textContent?.trim() || '')
                    .join('')
                    .trim();
                  if (fullText && fullText.length > 0) {
                    // Clean up the username (remove extra spaces)
                    const cleanName = fullText.replace(/\s+/g, ' ').trim();
                    console.log('Extracted host name from direct child spans:', cleanName);
                    return cleanName;
                  }
                } else if (directChildSpans.length === 1) {
                  // Single direct child span
                  const childText = directChildSpans[0].textContent?.trim();
                  if (childText && childText.length > 0) {
                    console.log('Extracted host name from single child span:', childText);
                    return childText;
                  }
                } else {
                  // No direct child spans, use the span's own text content
                  const cleanName = text.split(' ')[0].replace(/[^\w\s@]/g, '').trim();
                  if (cleanName && cleanName.length > 0) {
                    console.log('Extracted host name from span text:', cleanName);
                    return cleanName;
                  }
                }
              }
            }

            // Alternative: look for the href attribute in links within the user container
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

    // Fallback methods if the specific structure isn't found
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

    // Last resort: look for any element with user-like content near host indicators
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
    currentSpaceSession = {
      id: spaceId,
      title: title,
      host: host,
      startTime: new Date().toISOString()
    };
    sessionStartTime = Date.now();
    
    // Notify background script (only if chrome.runtime is available and we have the correct extension ID)
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

      // Notify background script (only if chrome.runtime is available and we have the correct extension ID)
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

  // // Add report button overlay
  // function addReportOverlay() {
  //   // Remove existing overlay if present
  //   const existingOverlay = document.getElementById('xeet-report-overlay');
  //   if (existingOverlay) existingOverlay.remove();

  //   const overlay = document.createElement('div');
  //   overlay.id = 'xeet-report-overlay';
  //   overlay.innerHTML = `
  //     <div style="
  //       position: fixed;
  //       top: 20px;
  //       right: 20px;
  //       z-index: 10000;
  //       background: white;
  //       border: 2px solid #dc2626;
  //       border-radius: 8px;
  //       padding: 8px;
  //       box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  //       cursor: pointer;
  //       font-size: 12px;
  //       color: #dc2626;
  //       font-weight: bold;
  //     " onclick="window.postMessage({type: 'XEET_REPORT_CLICK'}, '*')">
  //       🚩 Report
  //     </div>
  //   `;
  //   document.body.appendChild(overlay);
  // }

  // Listen for report button clicks
  window.addEventListener('message', (event) => {
    if (event.data.type === 'XEET_REPORT_CLICK') {
      // Open extension popup or send message to background (only if available and we have the correct extension ID)
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

  // Initialize MutationObserver for dynamic DOM changes
  function initMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if added nodes contain Space-related elements
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
        // Debounce the detection to avoid excessive calls
        clearTimeout(window.spaceDetectionTimeout);
        window.spaceDetectionTimeout = setTimeout(detectSpace, 500);
      }
    });

    // Observe the entire document body for changes
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-testid', 'aria-label', 'role']
    });
  }

  // Initialize
  function init() {
    // Initial detection
    detectSpace();

    // Set up MutationObserver for dynamic changes
    initMutationObserver();

    // Fallback periodic check (less frequent)
    setInterval(detectSpace, 3000); // Check every 30 seconds as fallback

    // Add report overlay
    // addReportOverlay();

    // Listen for page navigation
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        // Reinitialize observer on navigation
        setTimeout(() => {
          initMutationObserver();
          detectSpace();
          // addReportOverlay();
        }, 2000); // Wait for page to load
      }
    }, 1000);
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