/**
 * Popup JS — UI kontrol mantığı
 * Content script ile mesajlaşarak durumu gösterir ve komut gönderir
 */

// DOM elementleri
const toggleBtn = document.getElementById('toggleBtn');
const btnIcon = document.getElementById('btnIcon');
const btnText = document.getElementById('btnText');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressCount = document.getElementById('progressCount');
const currentModule = document.getElementById('currentModule');
const logContainer = document.getElementById('logContainer');
const clearLogBtn = document.getElementById('clearLogBtn');
const alertBanner = document.getElementById('alertBanner');
const alertText = document.getElementById('alertText');
const wrongPageBanner = document.getElementById('wrongPageBanner');

let isRunning = false;
let logs = [];

/**
 * Content script'e mesaj gönder
 */
async function sendToContent(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('oba.gov.tr')) {
      return await chrome.tabs.sendMessage(tab.id, message);
    }
    return null;
  } catch (e) {
    console.error('Mesaj gönderilemedi:', e);
    return null;
  }
}

/**
 * UI'ı güncelle
 */
function updateUI(running) {
  isRunning = running;
  
  if (running) {
    toggleBtn.classList.add('active');
    btnIcon.textContent = '■';
    btnText.textContent = 'Durdur';
    statusDot.className = 'status-dot active';
  } else {
    toggleBtn.classList.remove('active');
    btnIcon.textContent = '▶';
    btnText.textContent = 'Başlat';
    statusDot.className = 'status-dot inactive';
  }
}

/**
 * İlerleme göstergesini güncelle
 */
function updateProgress(completed, total, label = '') {
  if (total > 0) {
    progressSection.classList.remove('hidden');
    const percent = Math.round((completed / total) * 100);
    progressBar.style.width = `${percent}%`;
    progressCount.textContent = `${completed} / ${total}`;
    if (label) {
      currentModule.textContent = `📖 ${label}`;
    }
  }
}

/**
 * Log ekle
 */
function addLog(message, type = 'info', timestamp = '') {
  const time = timestamp || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  // Boş mesajı kaldır
  const emptyEl = logContainer.querySelector('.log-empty');
  if (emptyEl) emptyEl.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const prefix = {
    'info': '📘',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌',
    'action': '🤖'
  }[type] || '📘';

  entry.innerHTML = `<span class="time">${time}</span>${prefix} ${message}`;
  
  // En üste ekle
  logContainer.prepend(entry);

  // Maksimum 30 log tut
  while (logContainer.children.length > 30) {
    logContainer.lastChild.remove();
  }

  logs.push({ message, type, timestamp: time });
}

/**
 * Sınav uyarısı göster
 */
function showExamAlert(moduleName) {
  alertBanner.classList.remove('hidden');
  alertText.textContent = `Sınav tespit edildi: ${moduleName}`;
  statusDot.className = 'status-dot warning';
}

/**
 * Durum kontrolü
 */
async function checkStatus() {
  const response = await sendToContent({ type: 'GET_STATUS' });
  
  if (!response) {
    // OBA sayfasında değiliz
    wrongPageBanner.classList.remove('hidden');
    statusText.textContent = 'OBA eğitim sayfasına gidin';
    toggleBtn.disabled = true;
    toggleBtn.style.opacity = '0.5';
    return;
  }

  wrongPageBanner.classList.add('hidden');
  toggleBtn.disabled = false;
  toggleBtn.style.opacity = '1';

  if (!response.isCoursePage) {
    wrongPageBanner.classList.remove('hidden');
    statusText.textContent = 'Bir eğitim oynatma sayfasına gidin';
    return;
  }

  updateUI(response.isRunning);

  // Video bilgisi
  if (response.video) {
    statusText.textContent = response.video.paused 
      ? 'Video duraklatıldı' 
      : `Video izleniyor... %${response.video.percent}`;
  }

  // Modül bilgisi
  if (response.modules && response.modules.total > 0) {
    updateProgress(response.modules.completed, response.modules.total);
  }
}

// ─── Event Listeners ───

// Başlat/Durdur butonu
toggleBtn.addEventListener('click', async () => {
  if (isRunning) {
    await sendToContent({ type: 'STOP' });
    updateUI(false);
    statusText.textContent = 'Durduruldu';
    addLog('ÖBA Asistan durduruldu', 'info');
  } else {
    const response = await sendToContent({ type: 'START' });
    if (response && response.success) {
      updateUI(true);
      statusText.textContent = 'Başlatılıyor...';
      addLog('ÖBA Asistan başlatıldı', 'success');
    } else {
      statusText.textContent = 'Başlatılamadı — eğitim sayfasında olduğunuzdan emin olun';
      addLog('Başlatma başarısız', 'error');
    }
  }
});

// Log temizle
clearLogBtn.addEventListener('click', () => {
  logContainer.innerHTML = '<div class="log-empty">Henüz işlem yok</div>';
  logs = [];
});

// Content script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'LOG':
      addLog(message.data.message, message.data.logType, message.data.timestamp);
      break;
    case 'STATUS_UPDATE':
      statusText.textContent = message.data.detail || message.data.status;
      if (message.data.status === 'stopped') updateUI(false);
      break;
    case 'PROGRESS_UPDATE':
      updateProgress(message.data.completed, message.data.total, message.data.currentLabel);
      break;
    case 'EXAM_ALERT':
      showExamAlert(message.data.moduleName);
      updateUI(false);
      addLog(`⚠️ SINAV: ${message.data.moduleName}`, 'warning');
      break;
  }
});

// İlk yükleme
checkStatus();

// Periyodik güncelleme
setInterval(checkStatus, 5000);
