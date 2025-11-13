import { useState, useEffect } from "react";

interface PostSnapshot {
  type: 'post';
  postId: string;
  username: string;
  profileImageUrl: string;
  likes: number | null;
  reposts: number | null;
  quotes: number | null;
  views: number | null;
}

interface AccountSnapshot {
  type: 'account';
  username: string;
  profileImageUrl: string;
  followers: number | null;
  following: number | null;
}

type PageSnapshot = PostSnapshot | AccountSnapshot | null;

const PageSnapshot = () => {
  const [snapshot, setSnapshot] = useState<PageSnapshot>(null);
  const [loading, setLoading] = useState(true);

  // URL validation functions
  const isValidPostUrl = (url: string): { username: string; postId: string } | null => {
    // Matches: https://x.com/username/status/1234567890123456789
    const match = url.match(/^https?:\/\/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)\/status\/(\d{19})$/);
    if (match) {
      return { username: match[1], postId: match[2] };
    }
    return null;
  };

  const isValidAccountUrl = (url: string): { username: string } | null => {
    // Matches: https://x.com/username (but not reserved pages)
    const match = url.match(/^https?:\/\/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)$/);
    if (match) {
      const username = match[1];
      // Exclude reserved pages
      const reservedPages = ['home', 'explore', 'notifications', 'messages', 'search', 'compose', 'i', 'settings'];
      if (!reservedPages.includes(username)) {
        return { username };
      }
    }
    return null;
  };

  const extractPageInfo = async () => {
    try {
      setLoading(true);

      if (!chrome?.tabs) {
        setSnapshot(null);
        return;
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.url) {
        setSnapshot(null);
        return;
      }

      // Check if it's a valid post or account URL first
      const postData = isValidPostUrl(currentTab.url);
      const accountData = isValidAccountUrl(currentTab.url);

      if (!postData && !accountData) {
        setSnapshot(null);
        return;
      }

      // Request data from content script
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id!, {
          action: 'EXTRACT_PAGE_DATA'
        });

        const pageData = response?.data;

        if (postData && pageData) {
          // Post data with real metrics from content script
          setSnapshot({
            type: 'post',
            postId: postData.postId,
            username: postData.username,
            profileImageUrl: pageData.profileImage || `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`,
            likes: pageData.postMetrics?.likes || 0,
            reposts: pageData.postMetrics?.reposts || 0,
            quotes: pageData.postMetrics?.replies || 0, // Using replies as quotes approximation
            views: pageData.postMetrics?.views || 0
          });
        } else if (accountData && pageData) {
          // Account data with real metrics from content script
          setSnapshot({
            type: 'account',
            username: accountData.username,
            profileImageUrl: pageData.profileImage || `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`,
            followers: pageData.followers || 0,
            following: pageData.following || 0,
          });
        } else {
          // Fallback to basic structure if content script fails
          if (postData) {
            setSnapshot({
              type: 'post',
              postId: postData.postId,
              username: postData.username,
              profileImageUrl: `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`,
              likes: 0,
              reposts: 0,
              quotes: 0,
              views: 0
            });
          } else if (accountData) {
            setSnapshot({
              type: 'account',
              username: accountData.username,
              profileImageUrl: `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`,
              followers: 0,
              following: 0,
            });
          }
        }
      } catch (error) {
        // Content script not available or failed, use fallback
        console.log('Content script not available, using fallback data');

        if (postData) {
          setSnapshot({
            type: 'post',
            postId: postData.postId,
            username: postData.username,
            profileImageUrl: `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`,
            likes: 0,
            reposts: 0,
            quotes: 0,
            views: 0
          });
        } else if (accountData) {
          setSnapshot({
            type: 'account',
            username: accountData.username,
            profileImageUrl: `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`,
            followers: 0,
            following: 0,
          });
        } else {
          setSnapshot(null);
        }
      }
    } catch (error) {
      console.error('Error extracting page info:', error);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    extractPageInfo();

    // Listen for tab updates
    if (chrome?.tabs?.onUpdated) {
      const handleTabUpdate = (changeInfo: any) => {
        if (changeInfo.url) {
          extractPageInfo();
        }
      };

      chrome.tabs.onUpdated.addListener(handleTabUpdate);

      return () => {
        chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      };
    }
  }, []);

  const formatCount = (count: number | null) => {
    if (count === null) return '--';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-blue-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-blue-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-blue-200 rounded w-1/4"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-3 bg-blue-200 rounded"></div>
            <div className="h-3 bg-blue-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    // Don't show anything for invalid URLs (like /home, /explore, etc.)
    return null;
  }

  if (snapshot.type === 'post') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img
              src={snapshot.profileImageUrl}
              alt={`${snapshot.username}'s profile`}
              className="w-12 h-12 rounded-full border-2 border-white"
            />
            <div>
              <div className="font-semibold text-gray-900">@{snapshot.username}</div>
              <div className="text-xs text-gray-600">Post ID: {snapshot.postId}</div>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            📄 Post
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{formatCount(snapshot.likes)}</div>
            <div className="text-xs text-gray-600">Likes</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{formatCount(snapshot.reposts)}</div>
            <div className="text-xs text-gray-600">Reposts</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{formatCount(snapshot.quotes)}</div>
            <div className="text-xs text-gray-600">Quotes</div>
          </div>
        </div>
      </div>
    );
  }

  // Account snapshot
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img
            src={snapshot.profileImageUrl}
            alt={`${snapshot.username}'s profile`}
            className="w-12 h-12 rounded-full border-2 border-white"
          />
          <div className="flex flex-col">
            <div className="font-semibold text-gray-900">@{snapshot.username}</div>
            <div className="flex flex-row text-center gap-2 mt-1">
              <div className="flex flex-row items-center text-xs gap-1">
                <div className=" font-semibold text-gray-900">{formatCount(snapshot.followers)}</div>
                <div className=" text-gray-600">Followers</div>
              </div>
              <div className="flex flex-row items-center text-xs gap-1">
                <div className="font-semibold text-gray-900">{formatCount(snapshot.following)}</div>
                <div className="text-gray-600">Following</div>
              </div>
            </div>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          👤 Account
        </span>
      </div>


    </div>
  );
};

export default PageSnapshot;