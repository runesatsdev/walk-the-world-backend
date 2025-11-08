import { useState } from "react";
import { showSuccessToast, showErrorToast } from "../ui/custom-toast";

interface IPostCard {
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
    onFeedbackSubmit?: () => void;
}

interface IAccountCard {
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
    onFeedbackSubmit?: () => void;
}

type IMiniCard = IPostCard | IAccountCard;

const MiniCard = (props: IMiniCard) => {
    // const { onFeedbackSubmit } = props;

    if (props.type === 'account') {
        return <AccountCard {...props} />;
    }

    return <PostCard {...props} />;
};

const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
};

const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
};

const AccountCard = ({
    name,
    username,
    profilePictureUrl,
    bio,
    accountlink,
    joinedDate,
    followers,
    following,
    tweets,
    onFeedbackSubmit,
}: IAccountCard) => {
    const [signalStrength, setSignalStrength] = useState<number | null>(null);
    const [authenticity, setAuthenticity] = useState<number | null>(null);
    const [sentiment, setSentiment] = useState<string>('');
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = () => {
        setSubmitted(true);
        if (onFeedbackSubmit) {
            try {
                onFeedbackSubmit();
                showSuccessToast("Feedback submitted, You've entered the reward lottery.");
            } catch (error) {
                showErrorToast("Failed to submit feedback");
            }
        }
    };

    const renderRatingButtons = (value: number | null, setValue: (val: number) => void, label: string, max: number = 5) => (
        <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex justify-between mt-1">
                {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
                    <button
                        key={num}
                        onClick={() => setValue(num)}
                        className={`px-3 py-1 rounded ${value === num ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                            } hover:bg-blue-400`}
                    >
                        {num}
                    </button>
                ))}
            </div>
        </div>
    );

    const formatJoinedDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <div className="py-4 my-2 border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    👤 Account
                </span>
            </div>
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center w-[80%]">
                    <img
                        src={profilePictureUrl}
                        alt={`${username}'s profile`}
                        className="h-12 w-12 rounded-full mr-3"
                    />
                    <div className="flex flex-col w-full">
                        <span className="font-semibold text-base">{name}</span>
                        <div className="flex w-full justify-between items-center">
                            <span className="text-gray-500 text-base">@{username}</span>
                            <span className="text-gray-500 text-xs ">{formatJoinedDate(joinedDate)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                    <a
                        href={accountlink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                    </a>
                </div>
            </div>
            <p className="text-gray-700 mt-2 text-sm">{bio}</p>
            <div className="flex justify-between space-x-6 mt-3 text-gray-500 text-xs">
                <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-900">{formatCount(following)}</span>
                    <span>Following</span>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-900">{formatCount(followers)}</span>
                    <span>Followers</span>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="font-semibold text-gray-900">{formatCount(tweets)}</span>
                    <span>Posts</span>
                </div>
            </div>
            {isExpanded && !submitted && (
                <div className="mt-4">
                    <h3 className="text-base font-medium">Rate this account</h3>
                    {renderRatingButtons(signalStrength, setSignalStrength, 'Signal Strength')}
                    {renderRatingButtons(authenticity, setAuthenticity, 'Authenticity')}
                    <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700">Sentiment</label>
                        <select
                            value={sentiment}
                            onChange={(e) => setSentiment(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select sentiment...</option>
                            <option value="positive">Positive</option>
                            <option value="neutral">Neutral</option>
                            <option value="negative">Negative</option>
                        </select>
                    </div>
                    <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700">Optional Note</label>
                        <div className="relative">
                            <textarea
                                value={note}
                                onChange={(e) => {
                                    if (e.target.value.length <= 280) {
                                        setNote(e.target.value);
                                    }
                                }}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                placeholder="Add any additional feedback..."
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                {note.length}/280
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!signalStrength || !authenticity || !sentiment}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Submit Feedback
                    </button>
                </div>
            )}
        </div>
    );
};

const PostCard = ({
    name,
    username,
    profilePictureUrl,
    content,
    tweetlink,
    timestamp,
    replies,
    reposts,
    likes,
    views,
    onFeedbackSubmit,
}: IPostCard) => {
    const [signalStrength, setSignalStrength] = useState<number | null>(null);
    const [authenticity, setAuthenticity] = useState<number | null>(null);
    const [sentiment, setSentiment] = useState<string>('');
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const formatTimeDiff = (timestamp: string) => {
        const now = new Date();
        const postTime = new Date(timestamp);
        const diffMs = now.getTime() - postTime.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    };

    const handleSubmit = () => {
        setSubmitted(true);
        if (onFeedbackSubmit) {
            try {
                onFeedbackSubmit();
                showSuccessToast("Feedback submitted, You've entered the reward lottery.");
            } catch (error) {
                showErrorToast("Failed to submit feedback");
            }
        }
    };

    const renderRatingButtons = (value: number | null, setValue: (val: number) => void, label: string) => (
        <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex justify-between mt-1">
                {[1, 2, 3, 4, 5].map((num) => (
                    <button
                        key={num}
                        onClick={() => setValue(num)}
                        className={`px-3 py-1 rounded ${value === num ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                            } hover:bg-blue-400`}
                    >
                        {num}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="py-4 my-2 border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📄 Post
                </span>
            </div>
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center">
                    <img
                        src={profilePictureUrl}
                        alt={`${username}'s profile`}
                        className="h-10 w-10 rounded-full mr-2"
                    />
                    <div className="flex flex-col">
                        <span className="font-semibold">{name}</span>
                        <div className="flex items-center space-x-2 text-base">
                            <span className="text-gray-500 ">@{username} · {formatTimeDiff(timestamp)}</span>
                            <a
                                href={tweetlink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    {isExpanded ? '▼' : '▶'}
                </button>
            </div>
            <p className="text-gray-700 mt-2 break-all text-sm">{truncateText(content)}</p>
            <div className="flex justify-between space-x-4 mt-2 text-gray-500 text-sm">
                <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    <span>{formatCount(replies)}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    <span>{formatCount(reposts)}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span>{formatCount(likes)}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    <span>{formatCount(views)}</span>
                </div>
            </div>
            {isExpanded && !submitted && (
                <div className="mt-4">
                    <h3 className="text-base font-medium">Rate this post</h3>
                    {renderRatingButtons(signalStrength, setSignalStrength, 'Signal Strength')}
                    {renderRatingButtons(authenticity, setAuthenticity, 'Authenticity')}
                    <div className="mt-2 text-sm">
                        <label className="block text-sm font-medium text-gray-700">Sentiment</label>
                        <select
                            value={sentiment}
                            onChange={(e) => setSentiment(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select sentiment...</option>
                            <option value="positive">Positive</option>
                            <option value="neutral">Neutral</option>
                            <option value="negative">Negative</option>
                        </select>
                    </div>
                    <div className="mt-2 text-sm">
                        <label className="block text-sm font-medium text-gray-700">Optional Note</label>
                        <div className="relative">
                            <textarea
                                value={note}
                                onChange={(e) => {
                                    if (e.target.value.length <= 280) {
                                        setNote(e.target.value);
                                    }
                                }}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                placeholder="Add any additional feedback..."
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                {note.length}/280
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!signalStrength || !authenticity || !sentiment}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Submit Feedback
                    </button>
                </div>
            )}
        </div>
    );
};

export default MiniCard;
