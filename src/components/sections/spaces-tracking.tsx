import { useState, useEffect } from "react";

interface SpaceSession {
  id: string;
  title: string;
  host: string;
  startTime: Date;
  duration: number; // in minutes
  rewardEarned: boolean;
}

const SpacesTracking = () => {
  const [activeSessions, setActiveSessions] = useState<SpaceSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<SpaceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
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
        setActiveSessions(result.activeSpaces || []);
        setCompletedSessions(result.completedSpaces || []);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  const handleSpaceSessionUpdate = (sessionData: any) => {
    const session: SpaceSession = {
      id: sessionData.id,
      title: sessionData.title,
      host: sessionData.host,
      startTime: new Date(sessionData.startTime),
      duration: sessionData.duration,
      rewardEarned: sessionData.rewardEarned || false
    };

    if (sessionData.completed) {
      setCompletedSessions(prev => [...prev, session]);
      setActiveSessions(prev => prev.filter(s => s.id !== session.id));
    } else {
      setActiveSessions(prev => {
        const existing = prev.find(s => s.id === session.id);
        if (existing) {
          return prev.map(s => s.id === session.id ? session : s);
        }
        return [...prev, session];
      });
    }

    // Save to storage
    if (chrome?.storage?.local) {
      chrome.storage.local.set({
        activeSpaces: activeSessions,
        completedSpaces: completedSessions
      });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
      <h2 className="text-lg font-semibold mb-4">X Spaces Presence Tracking</h2>
      <p className="text-sm text-gray-600 mb-4">
        Track your presence in X Spaces to earn seet rewards. Minimum 5 minutes required for rewards.
      </p>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium mb-2 text-green-600">Active Sessions</h3>
          {activeSessions.map(session => (
            <div key={session.id} className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <div className="font-medium">{session.title}</div>
              <div className="text-sm text-gray-600">Host: {session.host}</div>
              <div className="text-sm text-gray-600">
                Duration: {formatDuration(Math.floor((Date.now() - session.startTime.getTime()) / (1000 * 60)))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Sessions */}
      <div>
        <h3 className="text-md font-medium mb-2">Completed Sessions</h3>
        {completedSessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No completed sessions yet</p>
        ) : (
          completedSessions.slice(-10).reverse().map(session => (
            <div key={session.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
              <div className="font-medium">{session.title}</div>
              <div className="text-sm text-gray-600">Host: {session.host}</div>
              <div className="text-sm text-gray-600">Duration: {formatDuration(session.duration)}</div>
              <div className="text-sm text-green-600">
                {session.rewardEarned ? '✓ Reward earned' : 'No reward (minimum duration not met)'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SpacesTracking;