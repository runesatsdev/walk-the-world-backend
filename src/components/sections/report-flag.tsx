import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';
import { showSuccessToast, showErrorToast } from "../ui/custom-toast";
import { submitAdminReport } from "../../services/api";
import ReportModal from "../ui/report-modal";

interface ReportData {
  reason: string;
  customNote?: string;
  targetUserId?: string;
  tweetId?: string;
  currentMetrics?: {
    accountDetails?: any;
    postMetrics?: any;
  };
  reporterId: string;
  timestamp: string;
  screenshot?: string;
  url: string;
  reportId?: string;
}

const ReportFlag = () => {
  const { getAccessToken, user } = usePrivy();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // const reportReasons = [
  //   "Spam",
  //   "Fraud",
  //   "Rule violation",
  //   "Harassment",
  //   "Inappropriate content",
  //   "Other"
  // ];

  const extractContextFromUrl = (url: string) => {
    // Handle both twitter.com and x.com URLs
    const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)(?:\/status\/(\d+))?/);
    if (twitterMatch) {
      const username = twitterMatch[1];
      const tweetId = twitterMatch[2];

      return {
        targetUserId: username,
        tweetId: tweetId || null,
        contextType: tweetId ? 'post' : 'account'
      };
    }
    return { targetUserId: null, tweetId: null, contextType: 'unknown' };
  };

  const collectMetadata = async (contextType: string, targetUserId: string, tweetId: string | null) => {
    // In a real implementation, this would use content scripts to scrape the page
    // For now, we'll return placeholder data structure
    const metadata: any = {
      accountDetails: null,
      postMetrics: null
    };

    if (contextType === 'account' && targetUserId) {
      // Try to get account details from the page
      // This would require content script injection
      metadata.accountDetails = {
        username: targetUserId,
        followers: null, // Would be scraped
        following: null, // Would be scraped
        posts: null     // Would be scraped
      };
    } else if (contextType === 'post' && tweetId) {
      // Try to get post metrics from the page
      metadata.postMetrics = {
        reposts: null, // Would be scraped
        likes: null,   // Would be scraped
        quotes: null   // Would be scraped
      };
    }

    return metadata;
  };

  const handleReport = async (reason: string, customNote?: string, includeScreenshot?: boolean) => {
    setIsReporting(true);
    try {
      // Get access token
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Get current tab URL and extract contextual data
      let currentUrl = "";
      let contextData = { targetUserId: null as string | null, tweetId: null as string | null, contextType: 'unknown' as string };

      if (chrome?.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        currentUrl = tabs[0]?.url || "";
        contextData = extractContextFromUrl(currentUrl);
      }

      // Collect metadata
      const metadata = await collectMetadata(
        contextData.contextType,
        contextData.targetUserId || '',
        contextData.tweetId
      );

      // Capture screenshot if requested
      let screenshot = "";
      if (includeScreenshot) {
        try {
          if (chrome?.tabs?.captureVisibleTab) {
            screenshot = await chrome.tabs.captureVisibleTab();
          }
        } catch (error) {
          console.log("Screenshot capture failed:", error);
        }
      }

      const reportData = {
        reason,
        customNote,
        targetUserId: contextData.targetUserId || undefined,
        tweetId: contextData.tweetId || undefined,
        currentMetrics: {
          accountDetails: metadata.accountDetails,
          postMetrics: metadata.postMetrics
        },
        reporterId: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        screenshot,
        url: currentUrl
      };

      // Submit to admin API
      const result = await submitAdminReport(accessToken, reportData);

      if (!result) {
        throw new Error('Failed to submit report to admin API');
      }

      // Save report locally for audit trail
      const localReport: ReportData = {
        ...reportData,
        reportId: result.reportId
      };

      const existingReports = JSON.parse(localStorage.getItem('reports') || '[]');
      const updatedReports = [...existingReports, localReport];
      localStorage.setItem('reports', JSON.stringify(updatedReports));
      setReports(updatedReports);

      showSuccessToast("Report submitted successfully!");
    } catch (error) {
      console.error("Error submitting report:", error);
      showErrorToast("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };

  const loadReports = () => {
    const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
    setReports(savedReports);
  };

  // Load reports on component mount
  useEffect(() => {
    loadReports();
  }, []);

  return (
    <>
      <div className="w-full md:w-[400px] bg-white flex flex-col border-l border-[#E2E3F0] p-4 h-[calc(100vh-120px)] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Report & Flag</h2>
        <p className="text-sm text-gray-600 mb-6">
          Help maintain a safe and positive X community. Report spam, fraud, harassment, or rule violations from profiles, posts, or Spaces. Your reports help protect users and improve platform safety.
        </p>

        {/* Report Button */}
        <div className="mb-6">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isReporting}
            className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            📋 Report Content
          </button>
        </div>

        {/* Recent Reports */}
        <div>
          <h3 className="text-md font-medium mb-2">Recent Reports</h3>
          {reports.length === 0 ? (
            <p className="text-gray-500 text-sm">No reports submitted yet</p>
          ) : (
            reports.slice(-5).reverse().map((report, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                <div className="font-medium text-red-600">{report.reason}</div>
                <div className="text-sm text-gray-600 mb-1">{report.customNote || 'No additional details'}</div>
                <div className="text-xs text-gray-500">
                  {new Date(report.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  URL: {report.url}
                </div>
                {report.targetUserId && (
                  <div className="text-xs text-gray-500">
                    Target: @{report.targetUserId}
                  </div>
                )}
                {report.screenshot && (
                  <div className="mt-2">
                    <img
                      src={report.screenshot}
                      alt="Screenshot"
                      className="w-full h-20 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await handleReport(data.reason, data.customNote, data.includeScreenshot);
        }}
        isSubmitting={isReporting}
      />
    </>
  );
};

export default ReportFlag;