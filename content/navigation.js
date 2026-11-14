/**
 * Navigasyon Modülü
 * OBA sidebar'daki modül listesini parse eder
 * Aktif modülden SONRAKİ modüle geçer
 * Sınav modülüne gelince DURUR
 * 
 * OBA DOM Yapısı:
 *   div.meta-info-unit
 *     div.icon (.text-success if active)
 *       i.material-icons  →  check_circle | timelapse | radio_button_unchecked
 *     div.value
 *       a.course-player-object-item (id="content_XXXXX", .isDisabled if locked)
 */
const Navigation = (() => {
  let isActive = false;
  let moduleList = [];
  let listenersInstalled = false;
  let isNavigating = false;

  /**
   * Tüm asistanın durdurulmasını iste (main.js dinler).
   * Sadece Navigation'ı durdurmak yetmez; video/SCORM modülleri ve kayıtlı
   * isRunning durumu açık kalırsa sayfa yenilendiğinde asistan devam eder.
   */
  function requestFullStop(reason) {
    stop();
    window.dispatchEvent(new CustomEvent('oba-asistan:stop-requested', { detail: { reason } }));
  }

  /**
   * Sidebar'daki modülleri parse et (OBA-spesifik DOM yapısı)
   */
  function parseModules() {
    moduleList = [];
    
    // Tüm modül birimleri
    const units = document.querySelectorAll('.meta-info-unit');
    
    units.forEach((unit, index) => {
      const link = unit.querySelector('a.course-player-object-item');
      const icon = unit.querySelector('i.material-icons');
      
      if (!link) return;

      const iconText = icon?.textContent?.trim() || '';
      const text = link.textContent.trim();
      const isDisabled = link.classList.contains('isDisabled');
      const isCompleted = iconText === 'check_circle';
      const isCurrent = iconText === 'timelapse';
      const isNotStarted = iconText === 'radio_button_unchecked';
      
      // Sınav mı?
      const isExam = /sınav|test|quiz|exam|değerlendirme|performans/i.test(text);

      moduleList.push({
        element: link,
        text: text.substring(0, 100),
        href: link.href || '',
        id: link.id || '',
        index,
        completed: isCompleted,
        current: isCurrent,
        notStarted: isNotStarted,
        disabled: isDisabled,
        isExam
      });
    });

    HumanBehavior.log(`${moduleList.length} modül tespit edildi`, 'info');
    return moduleList;
  }

  /**
   * Şu anki aktif modülü bul ve SONRAKİNE geç
   */
  async function goToNext() {
    if (!isActive) return;
    // Aynı anda iki geçiş başlamasın (ör. iki tamamlanma olayı art arda gelirse)
    if (isNavigating) return;
    isNavigating = true;
    try {
      await navigateToNext();
    } finally {
      isNavigating = false;
    }
  }

  async function navigateToNext() {
    parseModules();

    if (moduleList.length === 0) {
      HumanBehavior.log('Modül listesi bulunamadı', 'warning');
      return;
    }

    // Şu anki aktif modülü bul (timelapse ikonlu)
    const currentIndex = moduleList.findIndex(m => m.current);
    
    // Eğer aktif modül bulunamazsa, URL ile eşleştir
    let nextIndex = -1;
    if (currentIndex >= 0) {
      nextIndex = currentIndex + 1;
    } else {
      // URL'deki content ID ile eşleştir
      const currentUrl = window.location.href;
      const urlMatch = moduleList.findIndex(m => m.href && currentUrl.includes(m.href.split('/').pop()));
      if (urlMatch >= 0) {
        nextIndex = urlMatch + 1;
      } else {
        // Son tamamlanan modülden sonrakini bul
        let lastCompleted = -1;
        for (let i = moduleList.length - 1; i >= 0; i--) {
          if (moduleList[i].completed) {
            lastCompleted = i;
            break;
          }
        }
        nextIndex = lastCompleted + 1;
      }
    }

    // Sonraki modül var mı?
    if (nextIndex < 0 || nextIndex >= moduleList.length) {
      HumanBehavior.log('🎉 Tüm modüller tamamlandı!', 'success');
      HumanBehavior.updateStatus('all-done', 'Tüm eğitim modülleri tamamlandı!');
      requestFullStop('all-done');
      return;
    }

    const nextModule = moduleList[nextIndex];

    // Kilitli mi?
    if (nextModule.disabled) {
      HumanBehavior.log(`Sonraki modül kilitli: ${nextModule.text}`, 'warning');
      HumanBehavior.updateStatus('locked', `Sonraki modül henüz açılmadı: ${nextModule.text}`);
      // Sayfayı yenile, belki kilit açılmıştır
      await HumanBehavior.wait(5000);
      if (isActive) window.location.reload();
      return;
    }

    // SINAV KONTROLÜ — sınava gelince DUR
    if (nextModule.isExam) {
      HumanBehavior.log('⚠️ SINAV TESPİT EDİLDİ: ' + nextModule.text, 'warning');
      HumanBehavior.updateStatus('exam-found', '⚠️ Sınav modülü! Manuel müdahale gerekli.');
      
      HumanBehavior.sendMessage({
        type: 'EXAM_ALERT',
        data: { moduleName: nextModule.text }
      });

      requestFullStop('exam');
      return;
    }

    // İnsan-benzeri gecikmeyle sonraki modüle tıkla
    const currentName = currentIndex >= 0 ? moduleList[currentIndex].text : '?';
    HumanBehavior.log(`Geçiş: "${currentName}" → "${nextModule.text}"`, 'action');
    HumanBehavior.updateStatus('navigating', `Geçiliyor: ${nextModule.text}`);
    
    await HumanBehavior.randomDelay(3000, 8000);
    if (!isActive) return; // Beklerken durdurulduysa tıklama
    HumanBehavior.smoothScrollTo(nextModule.element);
    await HumanBehavior.wait(1000);
    if (!isActive) return;
    HumanBehavior.naturalClick(nextModule.element);

    // İlerleme güncelle
    const completed = moduleList.filter(m => m.completed).length;
    HumanBehavior.updateProgress(completed, moduleList.length, nextModule.text);
  }

  /**
   * Event listener'ları kur
   */
  function setupListeners() {
    // Durdur/Başlat döngüsünde dinleyiciler katlanmasın
    if (listenersInstalled) return;
    listenersInstalled = true;

    window.addEventListener('oba-asistan:video-ended', () => {
      if (isActive) {
        HumanBehavior.log('Video bitti, sonraki modüle geçiliyor...', 'action');
        goToNext();
      }
    });

    window.addEventListener('oba-asistan:scorm-completed', () => {
      if (isActive) {
        HumanBehavior.log('SCORM tamamlandı, sonraki modüle geçiliyor...', 'action');
        goToNext();
      }
    });

    window.addEventListener('oba-asistan:content-completed', () => {
      if (isActive) {
        HumanBehavior.log('İçerik tamamlandı, sonraki modüle geçiliyor...', 'action');
        goToNext();
      }
    });
  }

  function start() {
    if (isActive) return;
    isActive = true;

    HumanBehavior.log('Navigation başlatılıyor...', 'action');
    parseModules();
    setupListeners();

    const completed = moduleList.filter(m => m.completed).length;
    const current = moduleList.find(m => m.current);
    HumanBehavior.updateProgress(completed, moduleList.length, current?.text || '');
    HumanBehavior.log('Navigation aktif', 'success');
  }

  function stop() {
    isActive = false;
    HumanBehavior.log('Navigation durduruldu', 'info');
  }

  function getModuleInfo() {
    if (moduleList.length === 0) parseModules();
    return {
      total: moduleList.length,
      completed: moduleList.filter(m => m.completed).length,
      current: moduleList.find(m => m.current)?.text || '',
      modules: moduleList.map(m => ({
        text: m.text,
        completed: m.completed,
        current: m.current,
        disabled: m.disabled,
        isExam: m.isExam
      }))
    };
  }

  return { start, stop, goToNext, getModuleInfo, isActive: () => isActive };
})();
