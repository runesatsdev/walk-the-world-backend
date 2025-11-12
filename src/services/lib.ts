import type { TaskData } from './types';
// Helper function to transform backend task data to component format
export const transformTaskToContentItem = (task: TaskData) => {
    const signal = task.data;

    // The backend now returns data in the exact ContentItem format
    if (signal.type === 'post') {
        return {
            id: signal.id,
            type: 'post' as const,
            name: signal.name,
            username: signal.username,
            profilePictureUrl: signal.profilePictureUrl,
            content: signal.content || '',
            tweetlink: signal.tweetlink || '',
            timestamp: signal.timestamp || new Date().toISOString(),
            replies: signal.replies || 0,
            reposts: signal.reposts || 0,
            likes: signal.likes || 0,
            views: signal.views || 0,
        };
    } else if (signal.type === 'account') {
        return {
            id: signal.id,
            type: 'account' as const,
            name: signal.name,
            username: signal.username,
            profilePictureUrl: signal.profilePictureUrl,
            bio: signal.bio || '',
            accountlink: signal.accountlink || '',
            joinedDate: signal.joinedDate || '',
            followers: signal.followers || 0,
            following: signal.following || 0,
            tweets: signal.tweets || 0,
        };
    }

    return null;
};

export const formatCount = (count: number) =>
    count < 1000 ? count.toString() :
        count < 1_000_000 ? `${(count / 1000).toFixed(1)}K` :
            `${(count / 1_000_000).toFixed(1)}M`;

export const truncateText = (text: string, max = 50) =>
    text.length > max ? text.substring(0, max).trim() + "..." : text;

export const formatTimeDiff = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    return mins < 1 ? "now" : mins < 60 ? `${mins}m` : hrs < 24 ? `${hrs}h` : `${days}d`;
};

export const formatJoinedDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", year: "numeric" });


export const formatDurationMin = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const formatDurationSec = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

export const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const startTime = new Date(timestamp);
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
};