import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { showSuccessToast, showErrorToast } from "../ui/custom-toast";
import { submitFeedback } from "../../services/api";
import { formatCount, truncateText, formatJoinedDate, formatTimeDiff } from "../../services/lib";

interface FeedbackData {
  signalStrength: number | null;
  authenticity: number | null;
  sentiment: string;
  note: string;
}

interface BaseCardProps {
  id: string;
  name: string;
  username: string;
  profilePictureUrl: string;
  onFeedbackSubmit?: () => void;
}

interface PostCardProps extends BaseCardProps {
  type: "post";
  content: string;
  tweetlink: string;
  timestamp: string;
  replies: number;
  reposts: number;
  likes: number;
  views: number;
}

interface AccountCardProps extends BaseCardProps {
  type: "account";
  bio: string;
  accountlink: string;
  joinedDate: string;
  followers: number;
  following: number;
  tweets: number;
}

type MiniCardProps = PostCardProps | AccountCardProps;

/* ---------- Reusable Feedback Form ---------- */
const FeedbackForm = ({
  id,
  title,
  contentType,
  getAccessToken,
  onFeedbackSubmit,
}: {
  id: string;
  title: string;
  contentType: "post" | "account";
  getAccessToken: () => Promise<string | null>;
  onFeedbackSubmit?: () => void;
}) => {
  const [data, setData] = useState<FeedbackData>({
    signalStrength: null,
    authenticity: null,
    sentiment: "",
    note: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof FeedbackData, val: any) =>
    setData((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    const { signalStrength, authenticity, sentiment, note } = data;
    if (!signalStrength || !authenticity || !sentiment) return;

    try {
      setSubmitted(true);
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("No access token");

      const result = await submitFeedback(accessToken, `task_${id}`, {
        signalStrength,
        authenticity,
        sentiment,
      }, note || "");

      if (!result) throw new Error("Submission failed");
      console.log("Feedback submission result:", result);

      // store reward history
      if (chrome?.storage?.local) {
        const feedbackReward = {
          id: result.feedbackId,
          type: "feedback",
          contentType,
          title,
          submittedAt: new Date().toISOString(),
          rewardGranted: result.rewardGranted,
          rewardAmount: result.rewardAmount,
        };
        chrome.storage.local.get(["rewardHistory"], (res) => {
          const existing = Array.isArray(res.rewardHistory) ? res.rewardHistory : [];
          chrome.storage.local.set({
            rewardHistory: [...existing, feedbackReward].slice(-100),
          });
        });
      }

      showSuccessToast(
        result.rewardGranted
          ? `Feedback submitted! You won ${result.rewardAmount} Xeet reward!`
          : "Feedback submitted successfully!"
      );
      onFeedbackSubmit?.();
    } catch (err) {
      console.error("Error submitting feedback:", err);
      showErrorToast("Failed to submit feedback. Please try again.");
      setSubmitted(false);
    }
  };

  const RatingButtons = ({ label, value, onChange }: any) => (
    <div className="mt-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex justify-between mt-1">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`px-3 py-1 rounded ${
              value === num ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
            } hover:bg-blue-400`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );

  if (submitted) return null;

  return (
    <div className="mt-4">
      <h3 className="text-base font-medium">
        Rate this {contentType === "post" ? "post" : "account"}
      </h3>
      <RatingButtons label="Signal Strength" value={data.signalStrength} onChange={(v: number) => update("signalStrength", v)} />
      <RatingButtons label="Authenticity" value={data.authenticity} onChange={(v: number) => update("authenticity", v)} />

      <div className="mt-2">
        <label className="block text-sm font-medium text-gray-700">Sentiment</label>
        <select
          value={data.sentiment}
          onChange={(e) => update("sentiment", e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select sentiment...</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      <div className="mt-2 relative">
        <label className="block text-sm font-medium text-gray-700">Optional Note</label>
        <textarea
          value={data.note}
          onChange={(e) =>
            e.target.value.length <= 280 && update("note", e.target.value)
          }
          rows={3}
          className="mt-1 block w-full px-3 py-2 border rounded-md"
          placeholder="Add any additional feedback..."
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {data.note.length}/280
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!data.signalStrength || !data.authenticity || !data.sentiment}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
      >
        Submit Feedback
      </button>
    </div>
  );
};

/* ---------- AccountCard ---------- */
const AccountCard = (props: AccountCardProps) => {
  const { getAccessToken } = usePrivy();
  const [isExpanded, setExpanded] = useState(false);

  return (
    <div className="py-4 my-2 border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between">
        <span className="text-sm bg-green-100 px-2 py-1 rounded">👤 Account</span>
        <button onClick={() => setExpanded(!isExpanded)}>{isExpanded ? "▼" : "▶"}</button>
      </div>

      <div className="flex items-center mt-2">
        <img src={props.profilePictureUrl} className="h-12 w-12 rounded-full mr-3" />
        <div>
          <div className="font-semibold">{props.name}</div>
          <div className="text-gray-500 text-sm">@{props.username} · {formatJoinedDate(props.joinedDate)}</div>
        </div>
      </div>

      <p className="text-gray-700 mt-2 text-sm">{props.bio}</p>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{formatCount(props.following)} Following</span>
        <span>{formatCount(props.followers)} Followers</span>
        <span>{formatCount(props.tweets)} Posts</span>
      </div>

      {isExpanded && (
        <FeedbackForm
          id={props.id}
          title={props.name}
          contentType="account"
          getAccessToken={getAccessToken}
          onFeedbackSubmit={props.onFeedbackSubmit}
        />
      )}
    </div>
  );
};

/* ---------- PostCard ---------- */
const PostCard = (props: PostCardProps) => {
  const { getAccessToken } = usePrivy();
  const [isExpanded, setExpanded] = useState(false);

  return (
    <div className="py-4 my-2 border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between">
        <span className="text-sm bg-blue-100 px-2 py-1 rounded">📄 Post</span>
        <button onClick={() => setExpanded(!isExpanded)}>{isExpanded ? "▼" : "▶"}</button>
      </div>

      <div className="flex items-center mt-2">
        <img src={props.profilePictureUrl} className="h-10 w-10 rounded-full mr-2" />
        <div>
          <div className="font-semibold">{props.name}</div>
          <div className="text-gray-500 text-sm">@{props.username} · {formatTimeDiff(props.timestamp)}</div>
        </div>
      </div>

      <p className="text-gray-700 mt-2 break-all text-sm">{truncateText(props.content)}</p>
      <div className="flex justify-between text-sm text-gray-500 mt-2">
        <span>💬 {formatCount(props.replies)}</span>
        <span>🔁 {formatCount(props.reposts)}</span>
        <span>❤️ {formatCount(props.likes)}</span>
        <span>👁 {formatCount(props.views)}</span>
      </div>

      {isExpanded && (
        <FeedbackForm
          id={props.id}
          title={truncateText(props.content, 50)}
          contentType="post"
          getAccessToken={getAccessToken}
          onFeedbackSubmit={props.onFeedbackSubmit}
        />
      )}
    </div>
  );
};

/* ---------- MiniCard ---------- */
const MiniCard = (props: MiniCardProps) =>
  props.type === "account" ? <AccountCard {...props} /> : <PostCard {...props} />;

export default MiniCard;
