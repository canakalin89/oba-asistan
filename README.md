# ÖBA Asistan

OBA eğitim videolarını arka planda otomatik izleyen Chrome uzantısı. Öğretmenler için zaman kazandıran yardımcı.

## 🎯 Özellikler

- **Otomatik Video İzleme** — Eğitim videolarını 1x hızda, insan davranışını taklit ederek otomatik izler
- **Arka Plan Çalışma** — Sekme arka plandayken bile çalışmaya devam eder
- **SCORM Desteği** — SCORM paketlerini otomatik olarak yönetir
- **Sınav Algılama** — Sınavlarda otomatik olarak durur, kullanıcıyı bilgilendirir
- **Akıllı Navigasyon** — Eğitim bölümleri arasında otomatik geçiş yapar

## 📦 Kurulum

1. Bu repoyu klonlayın:
   ```bash
   git clone https://github.com/KULLANICI_ADI/oba-asistan.git
   ```
2. Chrome'da `chrome://extensions/` sayfasını açın
3. **Geliştirici modu**nu açın (sağ üst köşe)
4. **Paketlenmemiş öğe yükle** butonuna tıklayın
5. Klonlanan `oba-asistan` klasörünü seçin

## 🏗️ Proje Yapısı

```
oba-asistan/
├── manifest.json          # Chrome Extension manifest (v3)
├── background/
│   └── service-worker.js  # Arka plan servis worker
├── content/
│   ├── main.js            # Ana giriş noktası
│   ├── video-handler.js   # Video kontrol modülü
│   ├── scorm-handler.js   # SCORM yönetimi
│   ├── content-handler.js # İçerik yönetimi
│   └── navigation.js      # Bölüm navigasyonu
├── popup/
│   ├── popup.html         # Popup arayüzü
│   ├── popup.css          # Popup stilleri
│   └── popup.js           # Popup mantığı
├── utils/
│   └── human-behavior.js  # İnsan davranışı simülasyonu
└── icons/                 # Uzantı ikonları
```

## ⚠️ Sorumluluk Reddi

Bu araç yalnızca eğitim amaçlıdır. Kullanım sorumluluğu tamamen kullanıcıya aittir.

## 📄 Lisans

MIT License
