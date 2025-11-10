import { useState, useEffect } from "react";
import { showSuccessToast, showErrorToast } from "../ui/custom-toast";

interface ReportData {
  reason: string;
  description: string;
  screenshot?: string;
  url: string;
  timestamp: string;
}

const ReportFlag = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isReporting, setIsReporting] = useState(false);

  const reportReasons = [
    "Spam",
    "Fraud",
    "Rule violation",
    "Harassment",
    "Inappropriate content",
    "Other"
  ];

  const handleReport = async (reason: string, description: string) => {
    setIsReporting(true);
    try {
      // Get current tab URL
      let currentUrl = "";
      if (chrome?.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        currentUrl = tabs[0]?.url || "";
      }

      // Capture screenshot if available
      let screenshot = "";
      try {
        if (chrome?.tabs?.captureVisibleTab) {
          screenshot = await chrome.tabs.captureVisibleTab();
        }
      } catch (error) {
        console.log("Screenshot capture failed:", error);
      }

      const report: ReportData = {
        reason,
        description,
        screenshot,
        url: currentUrl,
        timestamp: new Date().toISOString()
      };

      // Save report locally (in production, this would be sent to moderation queue)
      const existingReports = JSON.parse(localStorage.getItem('reports') || '[]');
      const updatedReports = [...existingReports, report];
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
    <div className="w-full md:w-[400px] bg-white flex flex-col border-l border-[#E2E3F0] p-4 h-[calc(100vh-120px)] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Report & Flag</h2>
      <p className="text-sm text-gray-600 mb-6">
        Help maintain a safe and positive X community. Report spam, fraud, harassment, or rule violations from profiles, posts, or Spaces. Your reports help protect users and improve platform safety.
      </p>

      {/* Quick Report Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            const reason = prompt("Select reason:", reportReasons[0]);
            if (reason) {
              const description = prompt("Description (optional):") || "";
              handleReport(reason, description);
            }
          }}
          disabled={isReporting}
          className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          {isReporting ? "Submitting..." : "Quick Report Current Page"}
        </button>
      </div>

      {/* Report Reasons */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">Report Reasons</h3>
        <div className="grid grid-cols-2 gap-2">
          {reportReasons.map(reason => (
            <button
              key={reason}
              onClick={() => {
                const description = prompt(`Description for ${reason}:`) || "";
                handleReport(reason, description);
              }}
              className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm"
            >
              {reason}
            </button>
          ))}
        </div>
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
              <div className="text-sm text-gray-600 mb-1">{report.description}</div>
              <div className="text-xs text-gray-500">
                {new Date(report.timestamp).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 truncate">
                URL: {report.url}
              </div>
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
  );
};

export default ReportFlag;