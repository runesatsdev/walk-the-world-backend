// src/auth/AuthComponent.tsx
import { PrivyProvider, usePrivy, useLogin } from '@privy-io/react-auth';
import { useEffect } from 'react';

const privyAppId = 'cmhnyattb01frl50dwxk3prb4';

const AuthContent = () => {
    const { authenticated, ready } = usePrivy();
    const { login } = useLogin({
        onComplete: () => {
            // Open the extension popup after authentication
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    // Open the extension popup
                    chrome.action.openPopup();
                }
            });
        }
    });

    // Auto-trigger login when opened for authentication
    useEffect(() => {
        if (ready && !authenticated) {
            login();
        }
    }, [authenticated, ready]);

    return null;
};

export const AuthComponent = () => (
    <PrivyProvider
        appId={privyAppId}
        config={{
            loginMethods: ['twitter'],
            appearance: {
                theme: "light",
            }
        }}
    >
        <AuthContent />
    </PrivyProvider>
);

// Render the AuthComponent to the DOM
import { createRoot } from 'react-dom/client';
const container = document.getElementById('auth-root');
if (container) {
    const root = createRoot(container);
    root.render(<AuthComponent />);
}
