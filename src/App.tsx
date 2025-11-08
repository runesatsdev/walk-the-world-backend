// FILE ALTERED FROM CANONICAL STARTER
import { usePrivy } from "@privy-io/react-auth";
import { ToastContainer } from "react-toastify";
import { FullScreenLoader } from "./components/ui/fullscreen-loader";
// import { Header } from "./components/ui/header";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
// import UserObject from "./components/sections/user-object";
import CardList from "./components/sections/card-list";
import SpacesTracking from "./components/sections/spaces-tracking";
import ReportFlag from "./components/sections/report-flag";
import { useState } from "react";

function App() {
  const { ready, authenticated, logout, login, user } = usePrivy();
  const [activeTab, setActiveTab] = useState<'signals' | 'spaces' | 'report'>('signals');

  if (!ready) {
    return <FullScreenLoader />;
  }

  return (
    <div className="bg-white md:max-h-[100vh]">
      {/* <Header /> */}
      {authenticated ? (
        <section className="w-full flex flex-col">
          <div className="flex flex-col h-fit justify-between fixed top-0 left-0 w-full border-[#E2E3F0] md:static z-10 ">
            <div className=" flex p-4 justify-between w-full bg-black">
              <div className=" flex flex-row gap-2">
                <img src={`${user?.twitter?.profilePictureUrl}`} alt="User Avatar" className="h-12 w-12 rounded-full" />
                <div className="flex flex-col text-white">
                  <span className="font-semibold">{user?.twitter?.name}</span>
                  <span className="text-gray-500"> @{user?.twitter?.username}</span>
                </div>
              </div>
              <button className="button" onClick={logout}>
                <ArrowLeftIcon className="h-4 w-4" strokeWidth={2} /> Logout
              </button>
            </div>
            {/* Tab Navigation */}
            <div className="flex border-b border-[#E2E3F0] h-fit justify-between">
              <button
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'signals' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('signals')}
              >
                Signals
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'spaces' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('spaces')}
              >
                Spaces Tracking
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'report' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('report')}
              >
                Report & Flag
              </button>
            </div>
            {/* Tab Content */}
            {activeTab === 'signals' && <CardList />}
            {activeTab === 'spaces' && <SpacesTracking />}
            {activeTab === 'report' && <ReportFlag />}
          </div>
        </section>
      ) : (
        <section className="w-full flex flex-row justify-center items-center h-[calc(100vh)] relative">
          <img
            src="./BG.svg"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          <div className="z-10 flex flex-col items-center justify-center w-full h-full p-2">

            <div className="text-center mt-4 text-white text-7xl font-medium font-abc-favorit leading-[81.60px]">
              Xeet
            </div>
            <div className="text-center text-white text-xl font-normal leading-loose mt-8">
              Link your X account to get started
            </div>
            <button
              className="bg-white text-brand-off-black mt-15 w-full max-w-md rounded-full px-4 py-2 hover:bg-gray-100 lg:px-8 lg:py-4 lg:text-xl"
              onClick={() => {
                login();
                setTimeout(() => {
                  (
                    document.querySelector(
                      'input[type="email"]'
                    ) as HTMLInputElement
                  )?.focus();
                }, 150);
              }}
            >
              Get started
            </button>

            {/* {typeof chrome !== "undefined" && chrome?.runtime?.id && (
              <div className="flex space-x-4 mt-6">
                <button
                  className="bg-transparent text-white px-6 py-3 rounded-full hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    chrome.windows.create({
                      url: chrome.runtime.getURL("index.html"),
                      type: "normal",
                      width: 1200,
                      height: 800,
                    });
                  }}
                >
                  Open Popup
                </button>
                <button
                  className="bg-transparent text-white px-6 py-3 rounded-full hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    if (chrome.runtime.openOptionsPage) {
                      chrome.runtime.openOptionsPage();
                    } else {
                      chrome.tabs.create({
                        url: chrome.runtime.getURL("options.html"),
                      });
                    }
                  }}
                >
                  Open Options
                </button>
              </div>
            )} */}
          </div>
        </section>
      )}

      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        limit={1}
        aria-label="Toast notifications"
        style={{ top: 58 }}
      />
    </div>
  );
}

export default App;
