/**
 * Ana Content Script — Orchestrator
 * Tüm modülleri koordine eder
 */
const ObaAsistan = (() => {
  let isRunning = false;
  let restartTimer = null;

  /**
   * Eğitim oynatma sayfasında mıyız?
   */
  function isCoursePage() {
    return window.location.pathname.includes('/egitim/oynatma/');
  }

  /**
   * Tüm modülleri başlat
   */
  function start() {
    if (isRunning) return;
    if (!isCoursePage()) {
      HumanBehavior.log('Bu sayfa bir eğitim sayfası değil. Eğitim oynatma sayfasına gidin.', 'warning');
      HumanBehavior.updateStatus('wrong-page', 'Eğitim oynatma sayfasında değilsiniz');
      return;
    }

    isRunning = true;
    HumanBehavior.log('═══════════════════════════════════', 'info');
    HumanBehavior.log('ÖBA Asistan başlatıldı!', 'success');
    HumanBehavior.log('═══════════════════════════════════', 'info');
    HumanBehavior.updateStatus('starting', 'ÖBA Asistan başlatılıyor...');

    // Modülleri sırayla başlat
    VideoHandler.start();
    ScormHandler.start();
    ContentHandler.start();
    Navigation.start();

    // State'i kaydet
    chrome.storage.local.set({ isRunning: true });

    HumanBehavior.updateStatus('active', 'ÖBA Asistan aktif — arka planda çalışıyor');
  }

  /**
   * Tüm modülleri durdur
   */
  function stop(finalStatus = 'stopped', finalDetail = 'ÖBA Asistan durduruldu') {
    isRunning = false;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    VideoHandler.stop();
    ScormHandler.stop();
    ContentHandler.stop();
    Navigation.stop();

    HumanBehavior.log('ÖBA Asistan durduruldu', 'info');
    HumanBehavior.updateStatus(finalStatus, finalDetail);

    // State'i kaydet
    chrome.storage.local.set({ isRunning: false });
  }

  /**
   * Durum bilgisini döndür
   */
  function getStatus() {
    return {
      isRunning,
      isCoursePage: isCoursePage(),
      video: VideoHandler.getInfo(),
      modules: Navigation.getModuleInfo(),
      contentType: ContentHandler.detectContentType()
    };
  }

  // Chrome runtime mesajlarını dinle (popup'tan gelen komutlar)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'START':
        start();
        sendResponse({ success: true });
        break;
      case 'STOP':
        stop();
        sendResponse({ success: true });
        break;
      case 'GET_STATUS':
        sendResponse(getStatus());
        break;
      case 'GO_NEXT':
        Navigation.goToNext();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown command' });
    }
    return true; // Async response
  });

  // Sayfa yüklendiğinde önceki state'i kontrol et
  chrome.storage.local.get(['isRunning'], (result) => {
    if (result.isRunning && isCoursePage()) {
      HumanBehavior.log('Önceki oturum devam ettiriliyor...', 'info');
      // Kısa bir gecikme ile başlat (sayfa tamamen yüklensin)
      setTimeout(() => start(), 2000);
    }
  });

  // Navigation sınav veya bitiş tespit edince tüm asistanı durdur
  // (yalnızca Navigation durursa video/SCORM açık kalır ve sayfa yenilenince devam ederdi)
  window.addEventListener('oba-asistan:stop-requested', (e) => {
    if (!isRunning) return;
    const reason = e.detail?.reason;
    // Genel "durduruldu" yerine sınav/bitiş durumunu gönder; böylece popup mesajı
    // ve sınav rozeti (⚠) silinmez
    if (reason === 'exam') {
      stop('exam-found', '⚠️ Sınav modülü! Manuel müdahale gerekli.');
    } else if (reason === 'all-done') {
      stop('all-done', 'Tüm eğitim modülleri tamamlandı!');
    } else {
      stop();
    }
  });

  /**
   * Sayfa içi geçişten sonra sayfaya bağlı modülleri yeniden başlat.
   * Modüller zaten aktif olduğundan start() tek başına hiçbir şey yapmaz;
   * önce durdurulup sonra başlatılmaları gerekir.
   */
  function restartPageModules() {
    VideoHandler.stop();
    ScormHandler.stop();
    ContentHandler.stop();

    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (!isRunning) return;
      if (!isCoursePage()) {
        HumanBehavior.log('Eğitim sayfasından çıkıldı, asistan durduruluyor', 'warning');
        stop();
        return;
      }
      VideoHandler.start();
      ScormHandler.start();
      ContentHandler.start();
    }, 2000);
  }

  // Sayfa URL'i değiştiğinde (SPA navigasyon)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (isRunning) {
        HumanBehavior.log('Sayfa değişti, modüller yeniden başlatılıyor...', 'action');
        restartPageModules();
      }
    }
  }).observe(document, { subtree: true, childList: true });

  return { start, stop, getStatus };
})();
