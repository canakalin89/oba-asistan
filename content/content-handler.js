/**
 * İçerik Tamamlama Modülü
 * RichText ve PDF içeriklerini otomatik tamamlar
 * Bu içerik türleri sayfa yüklendiğinde zaten sunucuya bildirilir,
 * modül bunu tetikler ve doğrular
 */
const ContentHandler = (() => {
  let isActive = false;
  // Her start() yeni bir çalıştırma kimliği alır; stop() veya yeni sayfa
  // eski asenkron işlemleri geçersiz kılar
  let runId = 0;

  function isStale(id) {
    return !isActive || id !== runId;
  }

  /**
   * Sayfa içerik tipini tespit et
   * coursePlayer.js'den gelen veri yapısını kontrol eder
   */
  function detectContentType() {
    // Video elementi varsa video
    if (document.querySelector('video')) return 'video';
    
    // SCORM iframe varsa scorm
    if (window.API || window.API_1484_11) return 'scorm';
    
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        if (iframe.contentDocument) return 'scorm';
      } catch (e) {}
    }

    // PDF embed kontrolü
    if (document.querySelector('embed[type="application/pdf"], object[type="application/pdf"], .pdf-viewer, [class*="pdf"]')) {
      return 'pdf';
    }

    // Zengin metin kontrolü  
    if (document.querySelector('.rich-text, .richtext, [class*="content-body"], .ck-content')) {
      return 'richtext';
    }

    return 'unknown';
  }

  /**
   * Sayfadaki "Tamamla" / "Tamamlandı" butonunu bul ve tıkla
   */
  async function findAndClickComplete(id) {
    if (isStale(id)) return false;
    const completeTexts = ['tamamla', 'tamamlandı', 'bitir', 'complete', 'onayla'];
    const buttons = document.querySelectorAll('button, a, [role="button"], .btn');

    for (const btn of buttons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (completeTexts.some(ct => text.includes(ct)) && btn.offsetParent !== null) {
        await HumanBehavior.randomDelay(2000, 4000);
        if (isStale(id)) return false;
        HumanBehavior.naturalClick(btn);
        HumanBehavior.log(`"${text}" butonu tıklandı`, 'action');
        return true;
      }
    }
    return false;
  }

  /**
   * RichText içeriği işle
   */
  async function handleRichText(id) {
    HumanBehavior.log('RichText içerik tespit edildi', 'info');
    HumanBehavior.updateStatus('content', 'Metin içeriği okunuyor...');

    // Sayfanın yüklenmesini bekle
    await HumanBehavior.randomDelay(3000, 6000);
    if (isStale(id)) return;

    // Sayfayı aşağı kaydır (okumuş gibi)
    const scrollHeight = document.documentElement.scrollHeight;
    const step = Math.floor(scrollHeight / 4);

    for (let i = 0; i < 4; i++) {
      window.scrollBy({ top: step, behavior: 'smooth' });
      await HumanBehavior.randomDelay(2000, 4000);
      if (isStale(id)) return;
    }

    // Tamamla butonunu ara
    await findAndClickComplete(id);
    if (isStale(id)) return;

    HumanBehavior.log('RichText içerik tamamlandı', 'success');
    window.dispatchEvent(new CustomEvent('oba-asistan:content-completed'));
  }

  /**
   * PDF içeriği işle
   */
  async function handlePdf(id) {
    HumanBehavior.log('PDF içerik tespit edildi', 'info');
    HumanBehavior.updateStatus('content', 'PDF görüntüleniyor...');

    // PDF'in yüklenmesini bekle
    await HumanBehavior.randomDelay(5000, 10000);
    if (isStale(id)) return;

    // Tamamla butonu
    await findAndClickComplete(id);
    if (isStale(id)) return;

    HumanBehavior.log('PDF içerik tamamlandı', 'success');
    window.dispatchEvent(new CustomEvent('oba-asistan:content-completed'));
  }

  /**
   * Content handler'ı başlat
   */
  function start() {
    if (isActive) return;
    isActive = true;
    const id = ++runId;

    const contentType = detectContentType();
    HumanBehavior.log(`İçerik tipi tespit edildi: ${contentType}`, 'info');

    switch (contentType) {
      case 'richtext':
        handleRichText(id);
        break;
      case 'pdf':
        handlePdf(id);
        break;
      case 'video':
      case 'scorm':
        // Bu tipleri ilgili handler'lar yönetir
        break;
      default:
        HumanBehavior.log('Bilinmeyen içerik tipi, tamamla butonu aranıyor...', 'warning');
        HumanBehavior.randomDelay(3000, 5000).then(() => findAndClickComplete(id));
    }
  }

  /**
   * Content handler'ı durdur
   */
  function stop() {
    isActive = false;
    runId++; // Bekleyen asenkron işlemleri geçersiz kıl
    HumanBehavior.log('Content Handler durduruldu', 'info');
  }

  return { start, stop, detectContentType, isActive: () => isActive };
})();
