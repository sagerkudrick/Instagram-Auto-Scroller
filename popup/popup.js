const autoUnmute = document.getElementById("autoUnmuteToggle")
const autoCommentsToggle = document.getElementById("autoCommentsToggle")
const autoReelsToggle = document.getElementById("autoReelsToggle")
const startButton = document.getElementById("startStopButton")

chrome.storage.sync.get("autoUnmute", (result) => {
    print(result)
    autoMuteValue = result.autoUnmute;
    console.log("autoMute original value on startup: ", autoMuteValue);
    autoUnmute.checked = autoMuteValue
});

chrome.storage.sync.get("autoReelsStart", (result) => {
    print(result)
    autoReelsStartValue = result.autoReelsStart;
    console.log("autoReelsStart original value on startup: ", autoReelsStartValue);
    autoReelsToggle.checked = autoReelsStartValue
    document.getElementById("startStopButton").textContent = autoReelsStartValue ? "Stop" : "Start";
});

chrome.storage.sync.get("autoComments", (result) => {
    print(result)
    autoCommentsValue = result.autoComments;
    console.log("autoComments original value on startup: ", autoCommentsValue);
    autoCommentsToggle.checked = autoCommentsValue
});

autoUnmute.onclick = () => {
    const autoUnmuteValue = autoUnmute.checked
    chrome.runtime.sendMessage({ event: "autoMute", autoUnmuteValue})
}

autoCommentsToggle.onclick = () => {
    const autoCommentsValue = autoCommentsToggle.checked
    chrome.runtime.sendMessage({ event: "autoComments", autoCommentsValue})
}

autoReelsToggle.onclick = () => {
    const autoReelsValue = autoReelsToggle.checked
    chrome.runtime.sendMessage({ event: "autoReelsStart", autoReelsValue})
}

document.getElementById("startStopButton").addEventListener("click", () => {
    // Check if the button text is "Start" or "Stop"
    const isStarting = document.getElementById("startStopButton").textContent === "Start";
    
    // Toggle the button text (this is optional, depending on what you want)
    document.getElementById("startStopButton").textContent = isStarting ? "Stop" : "Start";
    
    // Send message to content.js (active tab)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        event: "toggleAutoReels",
        action: isStarting ? "start" : "stop",
      });
    });
  });