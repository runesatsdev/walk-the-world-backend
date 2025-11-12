import { useState, useEffect } from "react";
// import { showSuccessToast } from "../ui/custom-toast";

interface SpaceSession {
  id: string;
  title: string;
  host: string;
  hostUsername: string;
  spacelink: string;
  startTime: Date;
  duration: number; // in minutes
  rewardEarned: boolean;
  rewardAmount?: number;
  endTime?: Date;
  isClaimable?: boolean;
}

interface AvailableSpace {
  id: string;
  title: string;
  host: string;
  hostUsername: string;
  hostProfilePictureUrl: string;
  spacelink: string;
  description: string;
  participantCount: number;
  startedAt: string;
  estimatedDuration: number;
  rewardAmount: number;
  isLive: boolean;
  category: string;
  language: string;
  tags: string[];
}

const SpacesTracking = () => {
  const [activeSessions, setActiveSessions] = useState<SpaceSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<SpaceSession[]>([]);
  const [availableSpaces, setAvailableSpaces] = useState<AvailableSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingSpaceTitle, setTrackingSpaceTitle] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    loadAvailableSpaces();

    // Listen for messages from content script about space sessions
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'SPACE_SESSION_UPDATE') {
          handleSpaceSessionUpdate(message.data);
        }
      });
    }
  }, []);

  const loadSessions = () => {
    // Load from chrome storage
    if (chrome?.storage?.local) {
      chrome.storage.local.get(['activeSpaces', 'completedSpaces'], (result) => {
        const activeSpaces = Array.isArray(result.activeSpaces) ? result.activeSpaces : [];
        const completedSpaces = Array.isArray(result.completedSpaces) ? result.completedSpaces : [];
        setActiveSessions(activeSpaces);
        setCompletedSessions(completedSpaces);
        setTrackingSpaceTitle(activeSpaces.length > 0 ? activeSpaces[0].title : null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  const loadAvailableSpaces = async () => {
    try {
      // In production, this would fetch from your server API
      // const response = await fetch('https://api.xeet.com/v1/spaces/available');
      // const data = await response.json();

      // Mock data simulating server response
      const mockSpaces: AvailableSpace[] = [
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

      setAvailableSpaces(mockSpaces);
    } catch (error) {
      console.error('Failed to load available spaces:', error);
    }
  };

  const handleSpaceSessionUpdate = (sessionData: any) => {
    console.log("sessionData received in SpacesTracking:", sessionData);
    const session: SpaceSession = {
      id: sessionData.id,
      title: sessionData.title,
      host: sessionData.host,
      hostUsername: sessionData.hostUsername || 'unknown',
      spacelink: sessionData.spacelink || '',
      startTime: new Date(sessionData.startTime),
      duration: sessionData.duration || 0,
      rewardEarned: sessionData.rewardEarned || false,
      rewardAmount: sessionData.rewardAmount,
      endTime: sessionData.completed ? new Date() : undefined,
      isClaimable: sessionData.completed ? (sessionData.duration >= 1) : undefined
    };
    if (sessionData.completed) {
      setCompletedSessions(prev => {
        const updated = [...prev, session];
        // Save to storage after state update
        if (chrome?.storage?.local) {
          chrome.storage.local.set({
            completedSpaces: updated.slice(-100) // Keep last 100
          });
        }
        return updated;
      });
      setActiveSessions(prev => {
        const filtered = prev.filter(s => s.id !== session.id);
        if (chrome?.storage?.local) {
          chrome.storage.local.set({
            activeSpaces: filtered
          });
        }
        return filtered;
      });
      // Clear tracking title if this was the tracked space
      if (trackingSpaceTitle === session.title) {
        setTrackingSpaceTitle(null);
      }
    } else {
      setActiveSessions(prev => {
        const existing = prev.find(s => s.id === session.id);
        const updated = existing
          ? prev.map(s => s.id === session.id ? session : s)
          : [...prev, session];
        // Save to storage after state update
        if (chrome?.storage?.local) {
          chrome.storage.local.set({
            activeSpaces: updated
          });
        }
        return updated;
      });
      // Update tracking title when there's an active session
      setTrackingSpaceTitle(session.title);
    }
  };

  const formatDurationMin = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDurationSec = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleJoinSpace = (space: AvailableSpace) => {
    // Open space link in new tab
    window.open(space.spacelink, '_blank', 'noopener,noreferrer');

    // Notify background script about joining
    // if (chrome?.runtime?.sendMessage) {
    //   chrome.runtime.sendMessage({
    //     type: 'SPACE_JOIN_ATTEMPT',
    //     data: {
    //       spaceId: space.id,
    //       spaceLink: space.spacelink,
    //       spaceTitle: space.title,
    //       rewardAmount: space.rewardAmount,
    //       timestamp: new Date().toISOString()
    //     }
    //   });
    // }

    // Set tracking state
    // setTrackingSpaceTitle(space.title);
    // showSuccessToast(`Joined "${space.title}" - tracking for rewards!`);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const startTime = new Date(timestamp);
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  };

  if (loading) {
    return (
      <div className="w-full md:w-[400px] bg-white flex flex-col gap-2 border-l border-[#E2E3F0] p-4 h-[calc(100vh-140px)]">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading spaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-[400px] bg-white flex flex-col border-l border-[#E2E3F0] p-4 h-[calc(100vh-140px)] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">X Spaces Hub</h2>
      <p className="text-sm text-gray-600 mb-6">
        Discover live X Spaces, join discussions, and earn Xeet rewards for participation.
      </p>

      {/* Available Spaces */}
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3 text-blue-600">🔥 Live Spaces</h3>
        <div className="space-y-3">
          {availableSpaces.filter(space => space.isLive).map(space => (
            <div key={space.id} className={`bg-[#9c63fa] border border-purple-200 rounded-lg p-4 transition-all duration-300 ${trackingSpaceTitle === space.title ? 'ping-animation opacity-60' : ''}`}>
              <h4 className="font-semibold text-base mb-1 text-white">{space.title}</h4>
              <div className="flex items-center space-x-2 mb-2">
                <img
                  src={space.hostProfilePictureUrl}
                  alt={space.host}
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm text-white">@{space.hostUsername}</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-200">{formatTimeAgo(space.startedAt)}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4 text-xs text-gray-200">
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>{space.participantCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>~{space.estimatedDuration}min</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleJoinSpace(space)}
                disabled={trackingSpaceTitle === space.title}
                className="w-full cursor-pointer bg-white text-black text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4" style={{ color: 'rgb(15, 20, 25)' }}>
                  <g><path d="M21 12L4 2v20l17-10z"></path></g>
                </svg>
                {trackingSpaceTitle === space.title ? `🎯 Tracking for Rewards ${formatDurationSec(activeSessions[0]?.duration || 0)}` : `Join Space & Earn +${space.rewardAmount} Xeet`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      {/* {activeSessions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium mb-2 text-green-600">🎯 Active Tracking</h3>
          {activeSessions.map(session => (
            <div key={session.id} className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{session.title}</div>
                  <div className="text-sm text-gray-600">Host: {session.host}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    {formatDuration(session?.duration || 0)}
                  </div>
                  <div className="text-xs text-gray-500">elapsed</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )} */}

      {/* Completed Sessions */}
      <div>
        <h3 className="text-md font-medium mb-2">📊 Recent Sessions</h3>
        {completedSessions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">No completed sessions yet</p>
            <p className="text-xs text-gray-400 mt-1">Join a Space above to start earning!</p>
          </div>
        ) : (
          completedSessions.slice(-5).reverse().map(session => (
            <div key={session.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-sm">{session.title}</div>
                {/* <div className="text-right">
                  <div className={`text-xs font-medium ${session.rewardEarned ? 'text-green-600' : 'text-gray-500'
                    }`}>
                    {session.rewardEarned ? `✓ +${session.rewardAmount || 0} Xeet` : 'No reward'}
                  </div>
                </div> */}
              </div>
              <div className="text-xs text-gray-600">Host: {session.host}</div>
              <div className="text-xs text-gray-600">Duration: {formatDurationMin(session.duration)}</div>
              {session.isClaimable !== undefined && (
                <div className={`text-xs mt-1 ${session.isClaimable ? 'text-green-600' : 'text-gray-500'}`}>
                  {session.isClaimable ? '✓ Eligible for reward' : 'Not eligible (under 1 min)'}
                </div>
              )}
              {session.endTime ? (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(session.endTime).toLocaleDateString()} at {new Date(session.endTime).toLocaleTimeString()}
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-1 italic">
                  Ongoing
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SpacesTracking;