// ----------- State Variables ----------- //
let isOnReels = false;
let appIsRunning = false; 
let findComment; 
let newVideoObserver; 
let instagramObserver; 


// Function to stop the app
function stopApp() {
  if (appIsRunning) {
    appIsRunning = false;
    console.log("App stopped (navigated away from /reels/).");

    // Clean up your app logic here
    if (newVideoObserver) {
      newVideoObserver.disconnect();
      console.log("IntersectionObserver disconnected.");
    }
    if (findComment) {
      clearTimeout(findComment);
      console.log("Timeout cleared.");
    }
  }
}

// Function to check the URL and manage app state
function checkURLAndManageApp() {
  const isOnInstagram = window.location.href.startsWith("https://www.instagram.com/");
  const isOnReelsPage = window.location.href.startsWith("https://www.instagram.com/reels/");

  if (isOnInstagram && isOnReelsPage && !isOnReels) {
    // User navigated to /reels/
    isOnReels = true;
    initializeExtension(); // Start the app
  } else if ((isOnInstagram && !isOnReelsPage) || !isOnInstagram) {
    // User navigated away from /reels/ (either to instagram.com or outside Instagram)
    if (isOnReels) {
      isOnReels = false;
      stopApp(); // Stop the app
    }
  }
}

// Observe URL changes using MutationObserver
let lastUrl = window.location.href;
instagramObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    checkURLAndManageApp(); // Check URL and manage app state
  }
});

// Start observing the body for changes
instagramObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

// Listen for pushState, replaceState, and popstate events
(function (history) {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function () {
    pushState.apply(history, arguments);
    checkURLAndManageApp(); // Trigger logic on pushState
  };

  history.replaceState = function () {
    replaceState.apply(history, arguments);
    checkURLAndManageApp(); // Trigger logic on replaceState
  };
})(window.history);

window.addEventListener("popstate", checkURLAndManageApp);

// Initial check when the page loads
checkURLAndManageApp();

// ----------- App-Specific Logic ----------- //

function initializeExtension() {
  if (!appIsRunning) {
    appIsRunning = true;
    console.log("App started on /reels/.");

    // ----------- HTML Selectors ----------- //
    const VIDEOS_LIST_SELECTOR = "main video";
    const COMMENT_BUTTON_SELECTOR = "main svg[aria-label='Comment']";

    // ----------- State Variables ----------- //
    let applicationIsOn = true;
    let autoReelsStart;
    let autoComments;
    let autoUnmute;

    // ----------- Get Functions ----------- //
    function getStoredAutoReelsStart() {
      chrome.storage.sync.get(["autoReelsStart"], (result) => {
        autoReelsStart = result.autoReelsStart;
        console.log("Auto Reels Start setting:", autoReelsStart);
        if (autoReelsStart) startAutoScrolling();
      });
    }

    function getStoredAutoComments() {
      chrome.storage.sync.get(["autoComments"], (result) => {
        autoComments = result.autoComments;
        console.log("Auto comments setting:", autoComments);
      });
    }

    function getStoredAutoUnmute() {
      chrome.storage.sync.get(["autoUnmute"], (result) => {
        autoUnmute = result.autoUnmute;
        console.log("Auto autoUnmute setting:", autoUnmute);

        if (autoUnmute) {
          autoUnmuteAction()
            .then((button) => {
              console.log("Audio automatically unmuted.");
            })
            .catch((error) => {
              console.log("An error occurred: ", error);
            });
        }
      });
    }

    // ----------- Update Variables From Storage ----------- //
    getStoredAutoReelsStart();
    getStoredAutoComments();
    getStoredAutoUnmute();

    // ----------- Add Listeners To Change Stored Variables ----------- //
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync") {
        if (changes.autoReelsStart) {
          autoReelsStart = changes.autoReelsStart.newValue;
          console.log("Updated autoReelsStart:", autoReelsStart);
        }
        if (changes.autoComments) {
          autoComments = changes.autoComments.newValue;
          console.log("Updated autoComments:", autoComments);
        }
        if (changes.autoUnmute) {
          autoUnmute = changes.autoUnmute.newValue;
          console.log("Updated autoUnmute:", autoUnmute);
        }
      }
    });

    // Listener for start/stop button
    chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
      if (data.event === "toggleAutoReels") {
        if (data.action === "start") {
          chrome.storage.sync.set({ autoReelsStart: true });
          getStoredAutoReelsStart();
          startAutoScrolling();
        } else if (data.action === "stop") {
          chrome.storage.sync.set({ autoReelsStart: false });
          getStoredAutoReelsStart();
          stopAutoScrolling();
        }
      }
    });

    // Start auto-scrolling
    function startAutoScrolling() {
      console.log("start auto scrolling");
      if (!applicationIsOn) {
        applicationIsOn = true;
        chrome.storage.sync.set({ applicationIsOn: true });
        console.log("Auto-scrolling started.");
      }

      setTimeout(() => {
        console.log("autoReelsStart " + autoReelsStart);
        if (autoReelsStart) beginAutoScrollLoop();
      }, 500);
    }

    // Stop auto-scrolling
    function stopAutoScrolling() {
      if (applicationIsOn) {
        applicationIsOn = false;
        chrome.storage.sync.set({ applicationIsOn: false });
        getStoredAutoReelsStart();
        console.log("Auto-scrolling stopped.");
      }
    }

    // Start the loop for auto-scrolling
    function beginAutoScrollLoop() {
      setInterval(() => {
        if (applicationIsOn) {
          const currentVideo = getCurrentVideo();
          if (currentVideo) {
            currentVideo.removeAttribute("loop");
            currentVideo.addEventListener("ended", onVideoEnd);
          }
        }
      }, 100); // Repeat every 100ms
    }

    // Handles the end of a video
    function onVideoEnd() {
      const currentVideo = getCurrentVideo();
      if (!currentVideo) return;

      const nextVideoInfo = getNextVideo(currentVideo);
      const nextVideo = nextVideoInfo[0];
      const nextVideoIndex = nextVideoInfo[1];

      if (nextVideo && autoReelsStart) {
        scrollToNextVideo(nextVideo, nextVideoIndex);
      }
    }

    // Find the next video based on the current one
    function getNextVideo(currentVideo) {
      const videos = Array.from(document.querySelectorAll(VIDEOS_LIST_SELECTOR));
      const index = videos.findIndex((vid) => vid === currentVideo);
      return [videos[index + 1] || null, index + 1]; // Return the next video or null
    }

    // Scroll to the next video
    function scrollToNextVideo(nextVideo, nextVideoIndex) {
      if (nextVideo) {
        nextVideo.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "center",
        });
        console.log("Scrolling to the next video.");
      }
    }

    // Get the currently visible video on the screen
    function getCurrentVideo() {
      return Array.from(document.querySelectorAll(VIDEOS_LIST_SELECTOR)).find(
        (video) => {
          const rect = video.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        }
      );
    }

    newVideoObserver = new IntersectionObserver(
      (entries, newVideoObserver) => {
        entries.forEach((entry) => {
          // Check if the app is still running
          if (!appIsRunning) {
            console.log("App is no longer running, skipping video processing.");
            return;
          }



          if (entry.isIntersecting && !entry.target.dataset.processed) {
            console.log("Video is in view:", entry.target);
            console.log("autoComments: " + autoComments);
            if (autoComments) {
              openCommentsForVideo(entry.target);
            }

            // Mark this video as processed to prevent multiple triggers
            entry.target.dataset.processed = "true";
          } else if (!entry.isIntersecting) {
            // Reset the processed flag when the video goes out of view
            entry.target.dataset.processed = "";
          }
        });
      },
      { threshold: 0.5 }
    );

    // Function to start observing a video (could be called after navigating back)
    function observeVideo(video) {
      // Reset the processed flag in case the video was previously processed
      video.dataset.processed = "";
      newVideoObserver.observe(video);
    }

    // Function to observe all videos on the page
    function observeAllVideos() {
      const videos = document.querySelectorAll("main video");
      videos.forEach((video) => {
        observeVideo(video);
      });
    }

    // Start observing all videos initially
    observeAllVideos();

    // Function to open comments for the video
    function openCommentsForVideo(video) {
      console.log("Attempting to open comments for video...");

      findComment = setTimeout(() => {
        // Check if the app is still running
        if (!appIsRunning) {
          console.log("App is no longer running, skipping comment opening.");
          return;
        }

        // Find the visible comment button
        const commentButton = Array.from(
          document.querySelectorAll(COMMENT_BUTTON_SELECTOR)
        ).find((button) => {
          const rect = button.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        });

        // Check if the comment button is found and visible
        if (commentButton) {
          console.log("Visible comment button found, clicking it...");
          commentButton.closest('div[role="button"]').click();

          console.log("Clicked comment button for visible video.");
        } else {
          console.log("No visible comment button found.");
        }
      }, 1000); // Delay of 1000ms (1 second) before finding the visible comment button
    }

    // Helper function to check if a new video needs to be observed
    function checkAndObserveNewVideos() {
      const videos = document.querySelectorAll("main video");
      videos.forEach((video) => {
        if (!video.dataset.processed) {
          observeVideo(video);
        }
      });
    }

    // Interval to check for new videos to observe and process every 2 seconds
    setInterval(checkAndObserveNewVideos, 500);

    function autoUnmuteAction() {
      return new Promise((resolve) => {
        const checkButton = () => {
          const audioButton = Array.from(
            document.querySelectorAll("svg[aria-label='Audio is muted']")
          ).find((button) => {
            const rect = button.getBoundingClientRect();
            return (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= window.innerHeight &&
              rect.right <= window.innerWidth
            );
          });

          if (audioButton) {
            const button = audioButton.closest("div[role='button']");
            button.click();
            resolve(button);
            return;
          }

          setTimeout(checkButton, 500);
        };

        checkButton();
      });
    }
  }
}