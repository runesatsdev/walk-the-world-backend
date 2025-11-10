import { useState, useEffect } from "react";
// import { usePrivy } from "@privy-io/react-auth";
import { showSuccessToast, showErrorToast } from "../ui/custom-toast";

interface Reward {
  id: string;
  spaceId: string;
  spaceTitle: string;
  amount: number;
  earnedAt: string;
  claimed: boolean;
  claimedAt?: string;
}

const UserObject = () => {
  // const { user } = usePrivy();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = () => {
    // Load rewards from chrome storage
    if (chrome?.storage?.local) {
      chrome.storage.local.get(['rewardHistory'], (result) => {
        const rewardHistory = result.rewardHistory || [];
        const formattedRewards: Reward[] = rewardHistory.map((reward: any, index: number) => ({
          id: `reward_${index}`,
          spaceId: reward.spaceId,
          spaceTitle: reward.title,
          amount: reward.rewardType === 'space_participation' ? 25 : 0, // Default amount
          earnedAt: reward.timestamp,
          claimed: false, // In production, check against claimed rewards
          claimedAt: undefined
        }));
        setRewards(formattedRewards);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  const claimReward = async (rewardId: string) => {
    setClaimingReward(rewardId);
    try {
      // In production, this would call the Xeet API to claim the reward
      // const response = await fetch('/api/v1/rewards/claim', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ rewardId, userId: user?.id })
      // });

      // For now, simulate claiming
      await new Promise(resolve => setTimeout(resolve, 1000));

      setRewards(prev => prev.map(reward =>
        reward.id === rewardId
          ? { ...reward, claimed: true, claimedAt: new Date().toISOString() }
          : reward
      ));

      showSuccessToast("Reward claimed successfully!");
    } catch (error) {
      console.error('Failed to claim reward:', error);
      showErrorToast("Failed to claim reward");
    } finally {
      setClaimingReward(null);
    }
  };

  const totalEarned = rewards.reduce((sum, reward) => sum + reward.amount, 0);
  const totalClaimed = rewards.filter(r => r.claimed).reduce((sum, reward) => sum + reward.amount, 0);
  const availableToClaim = rewards.filter(r => !r.claimed).reduce((sum, reward) => sum + reward.amount, 0);

  if (loading) {
    return (
      <div className="w-full md:w-[400px] bg-white flex flex-col gap-2 border-l border-[#E2E3F0] p-4 h-[calc(100vh-120px)]">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-[400px] bg-white flex flex-col border-l border-[#E2E3F0] p-4 h-[calc(100vh-120px)] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Rewards</h2>
      <p className="text-sm text-gray-600 mb-6">
        Track your seet rewards earned from Space participation and content engagement. Claim rewards to add them to your wallet and monitor your earning history.
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{totalEarned}</div>
          <div className="text-sm text-gray-600">Total Earned</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{totalClaimed}</div>
          <div className="text-sm text-gray-600">Claimed</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{availableToClaim}</div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
      </div>

      {/* Rewards List */}
      <div className="space-y-3">
        <h3 className="text-md font-medium">Recent Rewards</h3>
        {rewards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No rewards earned yet</p>
            <p className="text-sm text-gray-400 mt-1">Join Spaces to start earning Xeet rewards!</p>
          </div>
        ) : (
          rewards.map(reward => (
            <div key={reward.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-green-600">+{reward.amount} Xeet</div>
                  <div className="text-sm text-gray-600">{reward.spaceTitle}</div>
                  <div className="text-xs text-gray-500">
                    Earned: {new Date(reward.earnedAt).toLocaleDateString()}
                  </div>
                  {reward.claimed && reward.claimedAt && (
                    <div className="text-xs text-green-600">
                      Claimed: {new Date(reward.claimedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {!reward.claimed && (
                  <button
                    onClick={() => claimReward(reward.id)}
                    disabled={claimingReward === reward.id}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {claimingReward === reward.id ? 'Claiming...' : 'Claim'}
                  </button>
                )}
                {reward.claimed && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
                    ✓ Claimed
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserObject;
