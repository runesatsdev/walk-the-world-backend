import { useState, useEffect } from "react";
import { isValidPostUrl, isValidAccountUrl, snapFormatCount } from "../../services/lib";

const DEFAULT_IMAGE =
  "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";

interface PostSnapshot {
  type: "post";
  postId: string;
  username: string;
  profileImageUrl: string;
  likes: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
}

interface AccountSnapshot {
  type: "account";
  username: string;
  profileImageUrl: string;
  followers: number;
  following: number;
}

type PageSnapshot = PostSnapshot | AccountSnapshot | null;

const PageSnapshot = () => {
  const [snapshot, setSnapshot] = useState<PageSnapshot>(null);
  const [loading, setLoading] = useState(true);

  const extractPageInfo = async () => {
    setLoading(true);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.url) return setSnapshot(null);

      const postUrl = isValidPostUrl(currentTab.url);
      const accountUrl = isValidAccountUrl(currentTab.url);

      if (!postUrl && !accountUrl) return setSnapshot(null);

      let pageData: any = null;

      try {
        const res = await chrome.tabs.sendMessage(currentTab.id!, {
          action: "EXTRACT_PAGE_DATA",
        });
        pageData = res?.data;
      } catch {
        console.log("Content script not available — using fallback.");
      }

      if (postUrl) {
        setSnapshot({
          type: "post",
          postId: postUrl.postId,
          username: postUrl.username,
          profileImageUrl: pageData?.profileImage || DEFAULT_IMAGE,
          likes: pageData?.postMetrics?.likes ?? 0,
          reposts: pageData?.postMetrics?.reposts ?? 0,
          quotes: pageData?.postMetrics?.replies ?? 0,
          bookmarks: pageData?.postMetrics?.bookmarks ?? 0,
        });
        return;
      }

      if (accountUrl) {
        setSnapshot({
          type: "account",
          username: accountUrl.username,
          profileImageUrl: pageData?.profileImage || DEFAULT_IMAGE,
          followers: pageData?.followers ?? 0,
          following: pageData?.following ?? 0,
        });
        return;
      }
    } catch (err) {
      console.error("Error extracting page info:", err);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    extractPageInfo();

    const listener = (_: any, changeInfo: any) => {
      if (changeInfo.url) extractPageInfo();
    };

    chrome.tabs.onUpdated.addListener(listener);
    return () => chrome.tabs.onUpdated.removeListener(listener);
  }, []);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 animate-pulse">
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
    );
  }

  if (!snapshot) return null;

  if (snapshot.type === "post") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img src={snapshot.profileImageUrl} className="w-12 h-12 rounded-full" />
            <div>
              <div className="font-semibold">@{snapshot.username}</div>
              <div className="text-xs text-gray-600">Post ID: {snapshot.postId}</div>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            📄 Post
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            ["Likes", snapshot.likes],
            ["Reposts", snapshot.reposts],
            ["Quotes", snapshot.quotes],
            ["Bookmarks", snapshot.bookmarks],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-lg font-semibold">{snapFormatCount(value as number)}</div>
              <div className="text-xs text-gray-600">{label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img src={snapshot.profileImageUrl} className="w-12 h-12 rounded-full" />
          <div>
            <div className="font-semibold">@{snapshot.username}</div>

            <div className="flex gap-4 mt-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="font-semibold">{snapFormatCount(snapshot.followers)}</span>
                <span className="text-gray-600">Followers</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="font-semibold">{snapFormatCount(snapshot.following)}</span>
                <span className="text-gray-600">Following</span>
              </div>
            </div>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          👤 Account
        </span>
      </div>
    </div>
  );
};

export default PageSnapshot;
