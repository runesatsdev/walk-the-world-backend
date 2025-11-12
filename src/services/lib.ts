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