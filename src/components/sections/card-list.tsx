import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';
import MiniCard from "../reusables/mini-card";
import { fetchNextTask } from "../../services/api";
import { transformTaskToContentItem } from "../../services/lib";

type ContentItem = Post | Account;

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

const CardList = () => {
    const { getAccessToken } = usePrivy();
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track feedback submissions to prevent repeats within 24 hours
    const [feedbackHistory, setFeedbackHistory] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        const init = async () => {
            await loadFeedbackHistory();
            await fetchContent();
        };
        init();
    }, []);

    const fetchContent = async () => {
        try {
            setLoading(true);

            // Get access token from Privy
            const accessToken = await getAccessToken();

            if (!accessToken) {
                throw new Error('No access token available');
            }

            // Fetch next task from backend using API service
            const taskData = await fetchNextTask(accessToken);
            const feedbackHistory = JSON.parse(localStorage.getItem('feedbackHistory') || '{}');

            // Transform backend data to match our ContentItem interface
            let contentItem: ContentItem | null = null;

            if (taskData) {
                contentItem = transformTaskToContentItem(taskData);
            }

            // Filter out content that has been rated in the last 24 hours
            const now = Date.now();
            const filteredContent = contentItem ? [contentItem].filter(item => {

                const lastRated = feedbackHistory[item.id];
                if (!lastRated) return true;
                return (now - lastRated) > 1000; // 1 second in milliseconds
                // return (now - lastRated) > (24 * 60 * 60 * 1000); // 24 hours in milliseconds
            }) : [];

            setContentItems(filteredContent);
        } catch (err) {
            setError('Failed to load content from server');
            console.error('Error fetching content:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFeedbackHistory = async () => {
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

    // Removed handleJoinSpace function as spaces are now handled in the dedicated Spaces Tracking tab

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
                    onFeedbackSubmit={() => handleFeedbackSubmit(item.id)}
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
