/**
 * SCORM İçerik Otomasyon Modülü
 * OBA'daki SCORM paketlerini (OutermostLMSV5.js) otomatik ilerletir
 * İnsan-benzeri tıklama ile etkileşimli içeriklerde ilerleme
 */
const ScormHandler = (() => {
  let isActive = false;
  let checkInterval = null;

  /**
   * SCORM iframe'ini tespit et
   */
  function findScormIframe() {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) return { iframe, doc: iframeDoc };
      } catch (e) {
        // Cross-origin iframe — erişilemez
      }
    }
    return null;
  }

  /**
   * Etkileşimli elementleri bul ve tıkla
   * "İleri", "Devam", "Sonraki", "Next" gibi butonlar
   */
  async function findAndClickNext(doc) {
    if (!doc) return false;

    const buttonTexts = [
      'ileri', 'devam', 'sonraki', 'next', 'continue', 'İleri', 'Devam', 
      'Sonraki', 'Next', 'Continue', 'ilerle', 'İlerle', 'tamam', 'Tamam',
      'OK', 'ok', 'Evet', 'evet', 'Kapat', 'kapat'
    ];

    // Buton ve tıklanabilir elementleri tara
    const clickables = doc.querySelectorAll('button, a, [role="button"], .btn, [onclick], input[type="button"], input[type="submit"]');
    
    for (const el of clickables) {
      const text = (el.textContent || el.value || '').trim().toLowerCase();
      const isNavigationButton = buttonTexts.some(bt => text.includes(bt.toLowerCase()));
      
      if (isNavigationButton && el.offsetParent !== null) { // Görünür olan
        await HumanBehavior.randomDelay(2000, 5000);
        if (!isActive) return false; // Beklerken durdurulduysa tıklama
        HumanBehavior.smoothScrollTo(el);
        await HumanBehavior.wait(500);
        HumanBehavior.naturalClick(el);
        HumanBehavior.log(`SCORM butonu tıklandı: "${text}"`, 'action');
        return true;
      }
    }

    return false;
  }

  /**
   * SCORM tamamlanma durumunu kontrol et
   */
  function checkCompletion() {
    try {
      if (window.API) {
        const status = window.API.LMSGetValue?.('cmi.core.lesson_status');
        if (status === 'completed' || status === 'passed') {
          HumanBehavior.log('SCORM içerik tamamlandı!', 'success');
          window.dispatchEvent(new CustomEvent('oba-asistan:scorm-completed'));
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  /**
   * SCORM sayfasında periyodik otomasyon
   */
  function startAutomation() {
    let clickAttempts = 0;
    const maxAttempts = 100; // Sonsuz döngüyü önle

    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(async () => {
      if (!isActive) return;
      if (clickAttempts >= maxAttempts) {
        HumanBehavior.log('SCORM: Maksimum otomasyon denemesine ulaşıldı', 'warning');
        return;
      }

      // Tamamlanma kontrolü
      if (checkCompletion()) {
        clearInterval(checkInterval);
        checkInterval = null;
        return;
      }

      // Iframe içinde ilerleme butonlarını tıkla
      const scormFrame = findScormIframe();
      if (scormFrame) {
        const clicked = await findAndClickNext(scormFrame.doc);
        if (clicked) clickAttempts++;
      }
      if (!isActive) return; // Beklerken durdurulduysa devam etme

      // Ana sayfadaki ilerleme butonlarını da kontrol et
      const mainClicked = await findAndClickNext(document);
      if (mainClicked) clickAttempts++;

    }, 8000 + Math.random() * 4000); // 8-12 saniye arası — insan temposu
  }

  /**
   * SCORM handler'ı başlat
   */
  function start() {
    if (isActive) return;
    isActive = true;

    HumanBehavior.log('SCORM Handler başlatılıyor...', 'action');
    
    // SCORM varlığını kontrol et
    const hasScorm = window.API || window.API_1484_11 || findScormIframe();
    
    if (hasScorm) {
      HumanBehavior.log('SCORM içerik tespit edildi, otomasyon başlatılıyor', 'success');
      HumanBehavior.updateStatus('scorm', 'SCORM etkileşimli içerik işleniyor...');
      startAutomation();
    } else {
      HumanBehavior.log('Bu sayfada SCORM içerik bulunamadı', 'info');
    }
  }

  /**
   * SCORM handler'ı durdur
   */
  function stop() {
    isActive = false;
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    HumanBehavior.log('SCORM Handler durduruldu', 'info');
  }

  return { start, stop, isActive: () => isActive };
})();
