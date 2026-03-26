/**
 * İnsan-benzeri davranış yardımcıları
 * Tüm modüller tarafından kullanılır
 */
const HumanBehavior = (() => {
  /**
   * Rastgele gecikme (ms) — min ile max arasında
   */
  function randomDelay(minMs = 1000, maxMs = 5000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Belirli bir süre bekle
   */
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Doğal tıklama simülasyonu — MouseEvent dispatch
   */
  function naturalClick(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 4;
    const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4;

    const events = ['mouseenter', 'mouseover', 'mousemove', 'mousedown', 'mouseup', 'click'];
    
    events.forEach((type, i) => {
      setTimeout(() => {
        const event = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          button: 0
        });
        element.dispatchEvent(event);
      }, i * (30 + Math.random() * 50));
    });

    return true;
  }

  /**
   * Smooth scroll to element
   */
  function smoothScrollTo(element) {
    if (!element) return;
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }

  /**
   * Log with timestamp
   */
  function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const prefix = {
      'info': '📘',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'action': '🤖'
    }[type] || '📘';
    
    console.log(`[ÖBA Asistan ${timestamp}] ${prefix} ${message}`);
    
    // Send to popup via chrome messaging
    try {
      chrome.runtime.sendMessage({
        type: 'LOG',
        data: { message, logType: type, timestamp }
      });
    } catch (e) {
      // Extension context might not be available
    }
  }

  /**
   * Durum güncelleme — popup'a bildir
   */
  function updateStatus(status, detail = '') {
    try {
      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        data: { status, detail }
      });
    } catch (e) {}
  }

  /**
   * İlerleme güncelleme
   */
  function updateProgress(completed, total, currentLabel = '') {
    try {
      chrome.runtime.sendMessage({
        type: 'PROGRESS_UPDATE',
        data: { completed, total, currentLabel }
      });
    } catch (e) {}
  }

  return {
    randomDelay,
    wait,
    naturalClick,
    smoothScrollTo,
    log,
    updateStatus,
    updateProgress
  };
})();
