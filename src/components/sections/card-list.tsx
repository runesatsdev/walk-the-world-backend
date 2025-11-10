import { useState, useEffect } from "react";
import MiniCard from "../reusables/mini-card";

type ContentItem = Post | Account | Space;

interface Post {
    id: string;
    type: 'post';
    name: string;
    username: string;
    profilePictureUrl: string;
    content: string;
    tweetlink: string;
    timestamp: string;
    replies: number;
    reposts: number;
    likes: number;
    views: number;
}

interface Account {
    id: string;
    type: 'account';
    name: string;
    username: string;
    profilePictureUrl: string;
    bio: string;
    accountlink: string;
    joinedDate: string;
    followers: number;
    following: number;
    tweets: number;
}

interface Space {
    id: string;
    type: 'space';
    title: string;
    host: string;
    hostUsername: string;
    hostProfilePictureUrl: string;
    spacelink: string;
    description: string;
    participantCount: number;
    startedAt: string;
    estimatedDuration: number; // in minutes
    rewardAmount: number; // Xeet reward amount
    isLive: boolean;
}

const CardList = () => {
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track feedback submissions to prevent repeats within 24 hours
    const [feedbackHistory, setFeedbackHistory] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        fetchContent();
        loadFeedbackHistory();
    }, []);

    const fetchContent = async () => {
        try {
            setLoading(true);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fetch available spaces from background script
            let spacesData: any[] = [];
            if (chrome?.runtime?.sendMessage) {
                try {
                    const response = await new Promise<any>((resolve) => {
                        chrome.runtime.sendMessage({ type: 'GET_AVAILABLE_SPACES' }, resolve);
                    });
                    spacesData = Array.isArray(response) ? response : [];
                } catch (error) {
                    console.log('Failed to fetch spaces from background:', error);
                }
            }

            // In a real implementation, this would call the Xeet API for posts/accounts
            // const response = await fetch('/api/v1/signals/*');
            // const data = await response.json();

            // Combine posts/accounts with spaces from background script
            const postsAndAccounts: ContentItem[] = [
                {
                    id: "1986975980678725634",
                    type: 'post',
                    name: "Josh Ong",
                    username: "beijingdou",
                    profilePictureUrl: "https://pbs.twimg.com/profile_images/1602122467002155010/MI7V7cqu.png",
                    content: "This is a sample tweet contentalsdfkljsadhfkljasjkldfhklj;wehfj;hwae;jkfhajk;lsefh;laksdhfkj;lsdhjkfhwuiefakljshdfjkhasdiufaweflkjashdljkfashdiuhwaekjfhl.",
                    tweetlink: "https://x.com/i/web/status/1986975980678725634",
                    timestamp: "2025-11-08T14:00:00Z",
                    replies: 12,
                    reposts: 45,
                    likes: 123,
                    views: 2456,
                },
                {
                    id: "44196397",
                    type: 'account',
                    name: "Elon Musk",
                    username: "elonmusk",
                    profilePictureUrl: "https://pbs.twimg.com/profile_images/1983681414370619392/oTT3nm5Z_400x400.jpg",
                    bio: "Mars & Cars & Energy & Comedy",
                    accountlink: "https://x.com/elonmusk",
                    joinedDate: "2009-06-02",
                    followers: 128000000,
                    following: 128,
                    tweets: 25000,
                }
            ];

            // Convert spaces data to ContentItem format and combine
            const spacesAsContentItems: ContentItem[] = spacesData.map(space => ({
                ...space,
                type: 'space' as const
            }));

            const mockData: ContentItem[] = [...postsAndAccounts, ...spacesAsContentItems];

            // Filter out content that has been rated in the last 24 hours
            const now = Date.now();
            const filteredContent = mockData.filter(item => {
                const lastRated = feedbackHistory[item.id];
                if (!lastRated) return true;
                return (now - lastRated) > (24 * 60 * 60 * 1000); // 24 hours in milliseconds
            });

            setContentItems(filteredContent);
        } catch (err) {
            setError('Failed to load content');
            console.error('Error fetching content:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFeedbackHistory = () => {
        const history = localStorage.getItem('feedbackHistory');
        if (history) {
            setFeedbackHistory(JSON.parse(history));
        }
    };

    const saveFeedbackHistory = (postId: string) => {
        const updatedHistory = {
            ...feedbackHistory,
            [postId]: Date.now()
        };
        setFeedbackHistory(updatedHistory);
        localStorage.setItem('feedbackHistory', JSON.stringify(updatedHistory));
    };

    const handleFeedbackSubmit = (contentId: string) => {
        saveFeedbackHistory(contentId);
        // Remove the content from the list after feedback is submitted
        setContentItems(prevItems => prevItems.filter(item => item.id !== contentId));
    };

    const handleJoinSpace = (spaceId: string, spaceLink: string) => {
        // Notify background script about space join attempt
        if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({
                type: 'SPACE_JOIN_ATTEMPT',
                data: { spaceId, spaceLink, timestamp: new Date().toISOString() }
            });
        }

        // Open space link in new tab
        window.open(spaceLink, '_blank', 'noopener,noreferrer');
    };

    if (loading) {
        return (
            <div className="w-full md:w-[400px] bg-white flex flex-col gap-2 border-l border-[#E2E3F0] p-4 h-[calc(100vh-60px)]">
                <div className="text-center py-8 mt-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading content...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full md:w-[400px] bg-white flex flex-col gap-2 border-l border-[#E2E3F0] p-4 h-[calc(100vh-60px)]">
                <div className="text-center py-8">
                    <p className="text-red-500">{error}</p>
                    <button
                        onClick={fetchContent}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full md:w-[400px] bg-white flex flex-col border-l border-[#E2E3F0] p-4 h-[calc(100vh-120px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Signals</h2>
            <p className="text-sm text-gray-600 mb-6">
                Discover trending posts, accounts, and Spaces on X. Rate content to help improve recommendations and earn rewards for quality engagement.
            </p>

            {contentItems.length ? contentItems.map((item) => (
                <MiniCard
                    key={item.id}
                    {...item}
                    {...(item.type === 'space'
                        ? { onJoinSpace: () => handleJoinSpace(item.id, item.spacelink) }
                        : { onFeedbackSubmit: () => handleFeedbackSubmit(item.id) }
                    )}
                />
            )) : (
                <div className="text-center py-8">
                    <p className="text-gray-500">No new content to rate!</p>
                    <p className="text-sm text-gray-400 mt-1">Check back later for more posts and accounts.</p>
                </div>
            )}
        </div>
    );
};

export default CardList;
