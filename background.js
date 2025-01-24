chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');

    chrome.storage.sync.get(["autoReelsStart", "applicationIsOn", "autoComments", "autoUnmute"], (result) => {
      if (result.autoReelsStart === undefined) {
        chrome.storage.sync.set({ autoReelsStart: true });
      }
      if (result.applicationIsOn === undefined) {
        chrome.storage.sync.set({ applicationIsOn: true });
      }
      if (result.autoComments === undefined) {
        chrome.storage.sync.set({ autoComments: true });
      }
      if (result.autoUnmute === undefined) {
        chrome.storage.sync.set({ autoUnmute: true });
      }
      console.log("Set up keys.");
    });
  });

chrome.runtime.onMessage.addListener(data => {
  switch(data.event) {

    case "autoMute":
      {
        console.log("Updating autoMute to: " + data.autoUnmuteValue)
        chrome.storage.sync.set( {"autoUnmute" : data.autoUnmuteValue} )
        break;
      }
    case "autoComments":
      {
        console.log("Updating autoComments to: " + data.autoCommentsValue)
        chrome.storage.sync.set( {"autoComments" : data.autoCommentsValue} )
        break;
      }

    case "autoReelsStart":
        {
          console.log("Updating autoReelsStart to: " + data.autoReelsValue)
          chrome.storage.sync.set( {"autoReelsStart" : data.autoReelsValue} )
          break;
        }

  }
})

