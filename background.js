// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOG') {
    console.log('FormExpo Extension (background):', message.data);
  } else if (message.type === 'ERROR') {
    console.error('FormExpo Extension (background):', message.data);
  }
  return true;
});

// Listen for tab updates to help with debugging
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tabId, tab.url);
  }
});
