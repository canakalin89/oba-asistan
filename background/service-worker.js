/**
 * Background Service Worker
 * State persistence ve badge yönetimi
 */

// Badge ikonunu güncelle
function updateBadge(isActive) {
  const color = isActive ? '#10b981' : '#6b7280';
  const text = isActive ? 'ON' : '';
  
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
}

// Mesajları dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'STATUS_UPDATE':
      if (message.data.status === 'active' || message.data.status === 'watching' || 
          message.data.status === 'scorm' || message.data.status === 'content') {
        updateBadge(true);
      } else if (message.data.status === 'stopped') {
        updateBadge(false);
      }
      break;

    case 'EXAM_ALERT':
      // Sınav bildirimi
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      chrome.action.setBadgeText({ text: '⚠' });
      break;

    case 'LOG':
    case 'PROGRESS_UPDATE':
      // Bu mesajları popup'a ilet (popup açıksa)
      break;
  }
});

// Extension kurulduğunda
chrome.runtime.onInstalled.addListener(() => {
  console.log('ÖBA Asistan kuruldu!');
  updateBadge(false);
  chrome.storage.local.set({ isRunning: false, logs: [] });
});
