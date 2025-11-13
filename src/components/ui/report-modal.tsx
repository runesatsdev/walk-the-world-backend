import { useState, useEffect } from "react";
import { showErrorToast } from "./custom-toast";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        reason: string;
        customNote: string;
        includeScreenshot: boolean;
    }) => Promise<void>;
    isSubmitting: boolean;
}

const reportReasons = [
    "Spam",
    "Fraud",
    "Rule Violation",
    "Other"
];

const ReportModal = ({ isOpen, onClose, onSubmit, isSubmitting }: ReportModalProps) => {
    const [reason, setReason] = useState<string>("");
    const [customNote, setCustomNote] = useState<string>("");
    const [includeScreenshot, setIncludeScreenshot] = useState<boolean>(false);

    const handleSubmit = async () => {
        if (!reason) {
            showErrorToast("Please select a report reason");
            return;
        }

        if (customNote.length > 500) {
            showErrorToast("Custom note must be 500 characters or less");
            return;
        }

        try {
            await onSubmit({
                reason,
                customNote,
                includeScreenshot
            });
            // Reset form
            setReason("");
            setCustomNote("");
            setIncludeScreenshot(false);
            onClose();
        } catch (error) {
            // Error is handled in parent component
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setReason("");
            setCustomNote("");
            setIncludeScreenshot(false);
            onClose();
        }
    };

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, isSubmitting]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
            <div
                className={`bg-white rounded-t-2xl w-full max-w-md mx-4 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Report Content</h2>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Report Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Report Reason *
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            disabled={isSubmitting}
                        >
                            <option value="">Select a reason...</option>
                            {reportReasons.map(reasonOption => (
                                <option key={reasonOption} value={reasonOption}>
                                    {reasonOption}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Details (Optional)
                        </label>
                        <div className="relative">
                            <textarea
                                value={customNote}
                                onChange={(e) => {
                                    if (e.target.value.length <= 500) {
                                        setCustomNote(e.target.value);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                                rows={4}
                                placeholder="Provide any additional context or details about this report..."
                                disabled={isSubmitting}
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                {customNote.length}/500
                            </div>
                        </div>
                    </div>

                    {/* Screenshot Toggle */}
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="screenshot"
                            checked={includeScreenshot}
                            onChange={(e) => setIncludeScreenshot(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                        <label htmlFor="screenshot" className="text-sm text-gray-700">
                            Include screenshot of current page
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex space-x-3 p-6 border-t border-gray-200">
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !reason}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                            </div>
                        ) : (
                            'Submit Report'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;