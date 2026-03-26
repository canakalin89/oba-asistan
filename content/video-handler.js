/**
 * Video Otomasyon Modülü
 * Video.js tabanlı OBA video player'ını kontrol eder
 * Strateji: 1x hızda oynat, odak engelini kaldır, otomatik devam
 */
const VideoHandler = (() => {
  let isActive = false;
  let player = null;
  let checkInterval = null;
  let originalOnBlur = null;
  let originalOnFocus = null;

  /**
   * Odak (focus) bypass — sekme değişince video durmasın
   */
  function bypassFocusCheck() {
    // Orijinal handler'ları sakla
    originalOnBlur = window.onblur;
    originalOnFocus = window.onfocus;

    // onblur'u devre dışı bırak
    window.onblur = null;
    window.onfocus = null;

    // Page Visibility API override
    try {
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true
      });
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true
      });
    } catch (e) {
      HumanBehavior.log('Visibility API override başarısız, alternatif yöntem deneniyor', 'warning');
    }

    // visibilitychange event'ini engelle
    document.addEventListener('visibilitychange', (e) => {
      e.stopImmediatePropagation();
    }, true);

    // blur event'ini engelle
    window.addEventListener('blur', (e) => {
      e.stopImmediatePropagation();
    }, true);

    // focus event'ini simüle etmek için periyodik tetikleme
    setInterval(() => {
      if (isActive) {
        window.dispatchEvent(new Event('focus'));
      }
    }, 5000);

    HumanBehavior.log('Odak bypass aktif — sekme değişiminde video durmayacak', 'success');
  }

  /**
   * Video elementini bul ve izlemeye başla
   */
  function findAndMonitorVideo() {
    const videoEl = document.querySelector('video');
    if (!videoEl) return false;

    player = videoEl;

    // Video durduğunda tekrar başlat
    player.addEventListener('pause', () => {
      if (isActive && !player.ended) {
        HumanBehavior.log('Video durdu, tekrar başlatılıyor...', 'action');
        HumanBehavior.wait(500 + Math.random() * 1000).then(() => {
          if (isActive && player.paused && !player.ended) {
            player.play().catch(() => {});
          }
        });
      }
    });

    // Video bittiğinde bildir
    player.addEventListener('ended', () => {
      HumanBehavior.log('Video tamamlandı!', 'success');
      HumanBehavior.updateStatus('completed', 'Video bitti, sonraki içeriğe geçiliyor...');
      
      // Navigation modülüne bildir
      window.dispatchEvent(new CustomEvent('oba-asistan:video-ended'));
    });

    // İlerleme takibi
    let lastReportedPercent = 0;
    player.addEventListener('timeupdate', () => {
      if (!player.duration) return;
      const percent = Math.floor((player.currentTime / player.duration) * 100);
      if (percent >= lastReportedPercent + 10) {
        lastReportedPercent = percent;
        HumanBehavior.log(`Video ilerleme: %${percent}`, 'info');
        HumanBehavior.updateStatus('watching', `Video izleniyor... %${percent}`);
      }
    });

    return true;
  }

  /**
   * Videoyu başlat
   */
  async function ensurePlaying() {
    if (!player) return;

    if (player.paused) {
      await HumanBehavior.randomDelay(500, 1500);
      try {
        await player.play();
        HumanBehavior.log('Video oynatılıyor (1x hız)', 'success');
      } catch (e) {
        HumanBehavior.log('Otomatik oynatma engellendi, kullanıcı etkileşimi gerekebilir', 'warning');
      }
    }
  }

  /**
   * Periyodik kontrol — video hala oynuyor mu?
   */
  function startWatchdog() {
    checkInterval = setInterval(async () => {
      if (!isActive) return;

      const videoEl = document.querySelector('video');
      if (videoEl && videoEl !== player) {
        // Yeni video elementi yüklendi (sayfa içi geçiş)
        player = videoEl;
        findAndMonitorVideo();
        HumanBehavior.log('Yeni video tespit edildi', 'info');
      }

      if (player && player.paused && !player.ended && isActive) {
        await ensurePlaying();
      }
    }, 3000);
  }

  /**
   * Video handler'ı başlat
   */
  function start() {
    if (isActive) return;
    isActive = true;

    HumanBehavior.log('Video Handler başlatılıyor...', 'action');
    bypassFocusCheck();

    if (findAndMonitorVideo()) {
      ensurePlaying();
      startWatchdog();
      HumanBehavior.log('Video Handler aktif', 'success');
    } else {
      HumanBehavior.log('Bu sayfada video bulunamadı', 'info');
      startWatchdog(); // Yine de dinle, belki sonra yüklenecek
    }
  }

  /**
   * Video handler'ı durdur
   */
  function stop() {
    isActive = false;
    
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }

    // Orijinal handler'ları geri yükle
    if (originalOnBlur) window.onblur = originalOnBlur;
    if (originalOnFocus) window.onfocus = originalOnFocus;

    HumanBehavior.log('Video Handler durduruldu', 'info');
  }

  /**
   * Video bilgisini döndür
   */
  function getInfo() {
    if (!player) return null;
    return {
      currentTime: player.currentTime,
      duration: player.duration,
      paused: player.paused,
      ended: player.ended,
      percent: player.duration ? Math.floor((player.currentTime / player.duration) * 100) : 0
    };
  }

  return { start, stop, getInfo, isActive: () => isActive };
})();
