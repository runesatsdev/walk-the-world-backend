import MiniCard from "../reusables/mini-card";

const mockData = [
    {
        name: "Josh Ong",
        username: "beijingdou",
        profilePictureUrl: "https://pbs.twimg.com/profile_images/1602122467002155010/MI7V7cqu.png",
        content: "This is a sample tweet content.",
        tweetlink: "https://x.com/i/web/status/1986975980678725634",
    },
    {
        name: "Samzy",
        username: "0xSamzy",
        profilePictureUrl: "https://pbs.twimg.com/profile_images/1743547374281064448/lADZQHOc.jpg",
        content: "Another sample tweet content.",
        tweetlink: "https://x.com/i/web/status/1986958271924547615",
    },
];

const CardList = () => {

    return (
        <div className="w-full md:w-[400px] bg-white flex flex-col gap-2 border-l border-[#E2E3F0] p-4 h-[calc(100vh-60px)]">
            {mockData.length ? mockData.map((item, index) => (
                <MiniCard key={index} {...item} />
            )) : (
                <p className="text-gray-500">No tweets available</p>
            )}
        </div>
    );
};

export default CardList;
