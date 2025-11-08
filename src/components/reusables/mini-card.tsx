import React from "react";

interface IAction {
    name: string;
    function: () => void;
    collapse?: boolean;
}

interface IMiniCard {
    name: string;
    username: string;
    profilePictureUrl: string;
    content: string;
    tweetlink: string;
}

const MiniCard = ({
    name,
    username,
    profilePictureUrl,
    content,
    tweetlink,
}: IMiniCard) => {
    return (
        <div className="py-4 my-4">
            <div className="flex flex-row items-center">
                <img
                    src={profilePictureUrl}
                    alt={`${username}'s profile`}
                    className="h-10 w-10 rounded-full mr-2"
                />
                <div className="flex flex-col">
                    <span className="font-semibold">{name}</span>
                    <span className="text-gray-500">@{username}</span>
                </div>
            </div>
            <p className="text-gray-700 mt-2">{content}</p>
            <a
                href={tweetlink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
            >
                View Tweet
            </a>
        </div>
    );
};

export default MiniCard;
