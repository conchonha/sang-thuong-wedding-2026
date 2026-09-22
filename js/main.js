/**
 * LUXURY WEDDING INVITATION - INTERACTION ENGINE
 * Couple: Thái Bá Sang & Phạm Thị Thương
 * Enhanced with Dynamic Guest Personalization & Couple Config Manager
 */

// ══ Cấu hình Google Sheets ══════════════════════════════════════════════
// ❗ Dán URL của Google Apps Script vào đây sau khi Deploy
// Hướng dẫn: xem file google_apps_script.gs
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxN5uazO9DhS9nRjqTBh8tjB9ptRJhV94elpJ78eplz2tN7pNxo8oRQN-NqmqHwK7Bj/exec';
const GOOGLE_SHEET_ID = '1JlN1-utEeoLThwzfsyvnNNIDQovqeocbMTEq_NSeWo4';

/**
 * Gửi dữ liệu RSVP lên Google Sheets (fire-and-forget, không block UI)
 */
function sendRsvpToGoogleSheet(data) {
  if (!GOOGLE_SHEET_URL) return; // Chưa cài URL thì bỏ qua
  fetch(GOOGLE_SHEET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    mode: 'no-cors' // Cần thiết vì Apps Script không trả CORS header
  }).catch(err => console.warn('Google Sheets RSVP error:', err));
}

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     0. DYNAMIC CONFIGURATION & GUEST PERSONALIZATION
     ========================================================================== */
  const urlParams = new URLSearchParams(window.location.search);
  const rawGuestName = urlParams.get('to') || urlParams.get('guest') || urlParams.get('name') || '';
  const rawSideParam = urlParams.get('side') || '';
  const rawTypeParam = (urlParams.get('type') || urlParams.get('event') || '').trim();

  // Logic phân loại hiển thị sự kiện theo URL:
  // 1. type=VK (hoặc type=vk, naptai, bride, gai, nhagai) -> Chỉ hiển thị Lễ Nạp Tài (Nhà Gái), ẩn Lễ Thành Hôn (Nhà Trai).
  // 2. type=all -> Hiển thị cả 2 buổi lễ.
  // 3. Mặc định (mở link index.html bình thường hoặc type=VT / vuquy / groom / nhatrai) -> Chỉ hiển thị Lễ Thành Hôn (Nhà Trai), ẩn Lễ Nạp Tài (Nhà Gái).
  let guestEvent = 'vuquy';
  const typeUpper = rawTypeParam.toUpperCase();
  const typeLower = rawTypeParam.toLowerCase();

  if (typeUpper === 'VK' || typeLower === 'naptai' || typeLower === 'bride' || typeLower === 'gai' || typeLower === 'nhagai') {
    guestEvent = 'naptai';
  } else if (typeLower === 'all') {
    guestEvent = 'all';
  } else {
    guestEvent = 'vuquy';
  }

  const guestSide = rawSideParam || (guestEvent === 'naptai' ? 'bride' : 'groom');

  const guestName = rawGuestName.trim();

  // Apply guest name to UI elements
  const envelopeGuestEl = document.getElementById('envelope-guest-name');
  const letterGuestEl = document.getElementById('letter-guest-name');
  const heroGuestEl = document.getElementById('hero-guest-name');
  const heroGuestWrap = document.getElementById('hero-guest-wrap');
  const rsvpNameInput = document.getElementById('rsvp-name');
  const wishNameInput = document.getElementById('wish-name');

  if (guestName) {
    if (envelopeGuestEl) envelopeGuestEl.innerText = guestName;
    if (letterGuestEl) letterGuestEl.innerText = guestName;
    if (heroGuestEl) heroGuestEl.innerText = guestName;
    if (heroGuestWrap) heroGuestWrap.style.display = 'flex';
    if (rsvpNameInput) {
      rsvpNameInput.value = guestName;
      rsvpNameInput.readOnly = true;
    }
    if (wishNameInput) {
      wishNameInput.value = guestName;
      wishNameInput.readOnly = true;
      wishNameInput.title = 'Tên của bạn được tự động ghi nhận từ thiệp mời';
    }

    const rawCfg = JSON.parse(localStorage.getItem('wedding_custom_config') || '{}');
    let cfgNeedsSave = false;
    if (rawCfg.brideName === 'Thị Thương' || rawCfg.brideName === 'Phạm Thị Thương') {
      rawCfg.brideName = 'Kiều Thương';
      cfgNeedsSave = true;
    }
    // Sanitize any legacy Hanoi / Đội Cấn dummy data from earlier tests in localStorage
    if (!rawCfg.vuquyAddress || 
        rawCfg.vuquyAddress.includes('Đội Cấn') || 
        rawCfg.vuquyAddress.includes('Doi Can') || 
        rawCfg.vuquyAddress.includes('Trống Đồng') || 
        rawCfg.vuquyAddress.includes('Trong Dong') || 
        rawCfg.vuquyAddress.includes('Quán Sứ') || 
        rawCfg.vuquyAddress.includes('Hà Nội') || 
        rawCfg.vuquyAddress.includes('Ha Noi') ||
        rawCfg.vuquyAddress.includes('Ba Đình')) {
      rawCfg.vuquyAddress = 'Sân vận động thôn Đại Mỹ, Xã Thượng Đức, Thành Phố Đà Nẵng';
      rawCfg.vuquyMap = 'https://maps.app.goo.gl/caDXU6YDqyaPM3Wt9';
      rawCfg.vuquyTime = '10:00 • 20.12.2026';
      cfgNeedsSave = true;
    }
    if (cfgNeedsSave) {
      try {
        localStorage.setItem('wedding_custom_config', JSON.stringify(rawCfg));
      } catch (e) {}
    }
    const cfg = rawCfg;
    const grName = cfg.groomName || 'Bá Sang';
    const brName = (cfg.brideName && cfg.brideName !== 'Thị Thương') ? cfg.brideName : 'Kiều Thương';
    document.title = `Thiệp Mời Cưới Trân Trọng Gửi ${guestName} | ${grName} & ${brName}`;
  } else {
    if (envelopeGuestEl) envelopeGuestEl.innerText = 'Quý Khách & Người Thương';
    if (letterGuestEl) letterGuestEl.innerText = 'Quý Khách & Người Thương';
    if (heroGuestWrap) heroGuestWrap.style.display = 'none';
  }

  // Pre-select RSVP side if specified in link
  if (guestSide) {
    const sideRadio = document.querySelector(`input[name="rsvp-side"][value="${guestSide === 'groom' ? 'Nhà Trai' : guestSide === 'bride' ? 'Nhà Gái' : 'Bạn chung'}"]`);
    if (sideRadio) sideRadio.checked = true;
  }

  // Purge any stale map/address keys from localStorage so they never conflict
  try {
    const rawCfg = JSON.parse(localStorage.getItem('wedding_custom_config') || '{}');
    let cfgCleaned = false;
    if (rawCfg.vuquyAddress || rawCfg.vuquyMap || rawCfg.naptaiAddress || rawCfg.naptaiMap) {
      delete rawCfg.vuquyAddress;
      delete rawCfg.vuquyMap;
      delete rawCfg.naptaiAddress;
      delete rawCfg.naptaiMap;
      cfgCleaned = true;
    }
    if (rawCfg.brideName === 'Thị Thương' || rawCfg.brideName === 'Phạm Thị Thương') {
      rawCfg.brideName = 'Kiều Thương';
      cfgCleaned = true;
    }
    if (cfgCleaned) {
      localStorage.setItem('wedding_custom_config', JSON.stringify(rawCfg));
    }
  } catch (e) {}

  // Load Custom Configuration for Date/Banks/Story from Couple Config
  const savedConfig = JSON.parse(localStorage.getItem('wedding_custom_config') || '{}');

  let targetWeddingTime = '2026-12-20T10:00:00+07:00';
  if (savedConfig.weddingDate) {
    targetWeddingTime = savedConfig.weddingDate;
  }
  if (savedConfig.weddingDateText) {
    const heroDateEl = document.getElementById('hero-date-text');
    if (heroDateEl) heroDateEl.innerText = savedConfig.weddingDateText;
  }

  // ═══ AUTHORITATIVE DEFAULT EVENT CONFIGURATIONS (BỎ LOCALSTORAGE CHO MAP) ═══
  // 1. Nhà Gái: Lễ Nạp Tài
  const DEFAULT_NAPTAI_TIME = '09:00 • 10.12.2026';
  const DEFAULT_NAPTAI_ADDRESS = 'Số 68 Phố Huế, Phường Hàng Bài, Quận Hoàn Kiếm, TP. Hà Nội';
  const DEFAULT_NAPTAI_MAP = 'https://maps.google.com/?q=68+Pho+Hue+Hanoi';
  const DEFAULT_NAPTAI_EMBED = 'https://maps.google.com/maps?q=68+Pho+Hue+Hoan+Kiem+Hanoi&t=&z=15&ie=UTF8&iwloc=&output=embed';

  const elNapTaiTime = document.getElementById('event-naptai-time');
  if (elNapTaiTime) elNapTaiTime.innerText = DEFAULT_NAPTAI_TIME;
  const elNapTaiAddr = document.getElementById('event-naptai-address');
  if (elNapTaiAddr) elNapTaiAddr.innerText = DEFAULT_NAPTAI_ADDRESS;
  const elNapTaiIframe = document.getElementById('event-naptai-iframe');
  if (elNapTaiIframe) elNapTaiIframe.src = DEFAULT_NAPTAI_EMBED;
  const elNapTaiBtn = document.getElementById('event-naptai-map-btn');
  if (elNapTaiBtn) elNapTaiBtn.href = DEFAULT_NAPTAI_MAP;
  const elNapTaiDirect = document.getElementById('event-naptai-map-direct');
  if (elNapTaiDirect) elNapTaiDirect.href = DEFAULT_NAPTAI_MAP;

  // 2. Nhà Trai: Lễ Vu Quy
  const DEFAULT_VUQUY_TIME = '10:00 • 20.12.2026';
  const DEFAULT_VUQUY_ADDRESS = 'Sân vận động thôn Đại Mỹ, Xã Thượng Đức, Thành Phố Đà Nẵng';
  const DEFAULT_VUQUY_MAP = 'https://maps.app.goo.gl/caDXU6YDqyaPM3Wt9';
  const DEFAULT_VUQUY_EMBED = 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1085.6283062991024!2d107.89884126958216!3d15.866987289056569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1svi!2s!4v1789618372252!5m2!1svi!2s';

  const elVuQuyTime = document.getElementById('event-vuquy-time');
  if (elVuQuyTime) elVuQuyTime.innerText = DEFAULT_VUQUY_TIME;
  const elVuQuyAddr = document.getElementById('event-vuquy-address');
  if (elVuQuyAddr) elVuQuyAddr.innerText = DEFAULT_VUQUY_ADDRESS;
  const elVuQuyIframe = document.getElementById('event-vuquy-iframe');
  if (elVuQuyIframe) elVuQuyIframe.src = DEFAULT_VUQUY_EMBED;
  const elVuQuyBtn = document.getElementById('event-vuquy-map-btn');
  if (elVuQuyBtn) elVuQuyBtn.href = DEFAULT_VUQUY_MAP;
  const elVuQuyDirect = document.getElementById('event-vuquy-map-direct');
  if (elVuQuyDirect) elVuQuyDirect.href = DEFAULT_VUQUY_MAP;

  // Bank Info
  if (savedConfig.bankGroomAcc) {
    const el = document.getElementById('groom-bank-acc');
    const btn = document.getElementById('groom-copy-btn');
    if (el) el.innerText = savedConfig.bankGroomAcc;
    if (btn) btn.setAttribute('data-account', savedConfig.bankGroomAcc);
  }
  if (savedConfig.bankBrideAcc) {
    const el = document.getElementById('bride-bank-acc');
    const btn = document.getElementById('bride-copy-btn');
    if (el) el.innerText = savedConfig.bankBrideAcc;
    if (btn) btn.setAttribute('data-account', savedConfig.bankBrideAcc);
  }

  // Story Milestones (6 Mốc Hành Trình Chung Đôi)
  if (savedConfig.story) {
    for (let i = 1; i <= 6; i++) {
      if (savedConfig.story[`date${i}`]) {
        const dateEl = document.getElementById(`story-date-${i}`);
        if (dateEl) dateEl.innerText = savedConfig.story[`date${i}`];
      }
      if (savedConfig.story[`desc${i}`]) {
        const descEl = document.getElementById(`story-desc-${i}`);
        if (descEl) descEl.innerText = savedConfig.story[`desc${i}`];
      }
    }
  }

  /* ==========================================================================
     INTELLIGENT EVENT FILTERING: LỄ NẠP TÀI (NHÀ GÁI) & LỄ VU QUY (NHÀ TRAI)
     "Mời tham dự tiệc nào?" (guestEvent) là yếu tố QUYẾT ĐỊNH hiển thị tiệc trên thiệp!
     - guestEvent = 'vuquy': Chỉ hiển thị duy nhất Lễ Vu Quy (Nhà Trai), ẩn Lễ Nạp Tài.
     - guestEvent = 'naptai': Chỉ hiển thị duy nhất Lễ Nạp Tài (Nhà Gái), ẩn Lễ Vu Quy.
     - guestEvent = 'all' hoặc rỗng: Hiển thị cả 2 tiệc Lễ Nạp Tài & Lễ Vu Quy.
     - guestSide (groom/bride/both): Quyết định đại diện kính báo và chọn sẵn phía khách trong RSVP.
     ========================================================================== */
  const cardNapTai = document.getElementById('card-event-naptai');
  const cardVuQuy = document.getElementById('card-event-vuquy');

  const honorQuote = document.getElementById('events-honor-quote');
  const sectionTitle = document.getElementById('events-section-title');
  const sectionSubtitle = document.getElementById('events-section-subtitle');

  const rsvpNapTai = document.getElementById('rsvp-pill-naptai');
  const rsvpVuQuy = document.getElementById('rsvp-pill-vuquy');
  const rsvpBoth = document.getElementById('rsvp-pill-both');

  const guestDisplayName = guestName || 'quý vị';

  if (guestEvent === 'vuquy') {
    // === 1. MỜI THAM DỰ LỄ VU QUY (NHÀ TRAI) ===
    // Quyết định: Chỉ hiện Lễ Vu Quy, ẩn hoàn toàn Lễ Nạp Tài
    if (cardNapTai) cardNapTai.style.display = 'none';
    if (cardVuQuy) cardVuQuy.style.display = 'flex';

    if (sectionTitle) sectionTitle.innerText = 'LỊCH TRÌNH LỄ THÀNH HÔN (NHÀ TRAI)';
    if (sectionSubtitle) {
      sectionSubtitle.innerText = guestSide === 'bride' ? 'Nhà Gái Kính Mời' : 'Nhà Trai Kính Mời';
    }

    if (honorQuote) {
      if (guestSide === 'bride') {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Cô Dâu &amp; Gia Đình Nhà Gái.&rdquo;`;
      } else {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Chú Rể &amp; Gia Đình Nhà Trai.&rdquo;`;
      }
    }

    // RSVP: Chỉ hiển thị Lễ Thành Hôn
    if (rsvpNapTai) rsvpNapTai.style.display = 'none';
    if (rsvpBoth) rsvpBoth.style.display = 'none';
    if (rsvpVuQuy) rsvpVuQuy.style.display = 'inline-flex';
    const r = document.querySelector('input[name="rsvp-event"][value="Lễ Thành Hôn"]') || document.querySelector('input[name="rsvp-event"][value="Lễ Vu Quy"]');
    if (r) r.checked = true;

  } else if (guestEvent === 'naptai') {
    // === 2. MỜI THAM DỰ LỄ NẠP TÀI (NHÀ GÁI) ===
    // Quyết định: Chỉ hiện Lễ Nạp Tài, ẩn hoàn toàn Lễ Vu Quy
    if (cardVuQuy) cardVuQuy.style.display = 'none';
    if (cardNapTai) cardNapTai.style.display = 'flex';

    if (sectionTitle) sectionTitle.innerText = 'LỊCH TRÌNH LỄ NẠP TÀI (NHÀ GÁI)';
    if (sectionSubtitle) {
      sectionSubtitle.innerText = guestSide === 'groom' ? 'Nhà Trai Kính Báo' : 'Nhà Gái Kính Báo';
    }

    if (honorQuote) {
      if (guestSide === 'groom') {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Chú Rể &amp; Gia Đình Nhà Trai.&rdquo;`;
      } else {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Cô Dâu &amp; Gia Đình Nhà Gái.&rdquo;`;
      }
    }

    // RSVP: Chỉ hiển thị Lễ Nạp Tài
    if (rsvpVuQuy) rsvpVuQuy.style.display = 'none';
    if (rsvpBoth) rsvpBoth.style.display = 'none';
    if (rsvpNapTai) rsvpNapTai.style.display = 'inline-flex';
    const r = document.querySelector('input[name="rsvp-event"][value="Lễ Nạp Tài"]');
    if (r) r.checked = true;

  } else {
    // === 3. MỜI THAM DỰ CẢ HAI BUỔI LỄ (HOẶC XEM CHUNG TỔNG QUAN) ===
    // Quyết định: Hiển thị cả 2 lễ
    if (cardNapTai) cardNapTai.style.display = 'flex';
    if (cardVuQuy) cardVuQuy.style.display = 'flex';

    if (sectionTitle) sectionTitle.innerText = 'LỊCH TRÌNH HÔN LỄ';
    if (sectionSubtitle) {
      if (guestSide === 'groom') sectionSubtitle.innerText = 'Nhà Trai Kính Báo';
      else if (guestSide === 'bride') sectionSubtitle.innerText = 'Nhà Gái Kính Báo';
      else sectionSubtitle.innerText = 'Trân Trọng Kính Báo';
    }

    if (honorQuote) {
      if (guestSide === 'groom') {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Chú Rể &amp; Gia Đình Nhà Trai.&rdquo;`;
      } else if (guestSide === 'bride') {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Cô Dâu &amp; Gia Đình Nhà Gái.&rdquo;`;
      } else {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với đôi bạn trẻ và hai bên gia đình.&rdquo;`;
      }
    }

    // RSVP: Hiển thị cả 3 và chọn sẵn Cả Hai Buổi Lễ
    if (rsvpNapTai) rsvpNapTai.style.display = 'inline-flex';
    if (rsvpVuQuy) rsvpVuQuy.style.display = 'inline-flex';
    if (rsvpBoth) {
      rsvpBoth.style.display = 'inline-flex';
      const r = document.querySelector('input[name="rsvp-event"][value="Cả Hai Buổi Lễ"]');
      if (r) r.checked = true;
    }
  }

  /* ==========================================================================
     1. AUDIO CONTROLLER & VINYL RECORD
     ========================================================================== */
  const audio = document.getElementById('wedding-audio');
  const musicToggleBtn = document.getElementById('music-toggle-btn');
  let isAudioPlaying = false;

  function playMusic() {
    if (!audio) return;
    audio.play().then(() => {
      isAudioPlaying = true;
      if (musicToggleBtn) musicToggleBtn.classList.add('playing');
    }).catch(err => {
      console.log('Audio autoplay prevented:', err);
    });
  }

  function pauseMusic() {
    if (!audio) return;
    audio.pause();
    isAudioPlaying = false;
    if (musicToggleBtn) musicToggleBtn.classList.remove('playing');
  }

  function toggleMusic() {
    if (isAudioPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMusic();
    });
  }

  const stickyMusicBtn = document.getElementById('sticky-music-btn');
  if (stickyMusicBtn) {
    stickyMusicBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMusic();
    });
  }

  /* ==========================================================================
     2. ENVELOPE OPENING EXPERIENCE
     ========================================================================== */
  const envelopeOverlay = document.getElementById('envelope-overlay');
  const envelopeWrapper = document.getElementById('envelope-wrapper');
  const waxSeal = document.getElementById('wax-seal');

  function openEnvelope() {
    if (!envelopeWrapper) return;
    if (envelopeWrapper.classList.contains('opened')) return;

    envelopeWrapper.classList.add('opened');
    playMusic();
    createSparkleBurst();

    setTimeout(() => {
      if (envelopeOverlay) {
        envelopeOverlay.classList.add('hidden');
      }
    }, 1500);
  }

  if (waxSeal) {
    waxSeal.addEventListener('click', (e) => {
      e.stopPropagation();
      openEnvelope();
    });
  }

  if (envelopeWrapper) {
    envelopeWrapper.addEventListener('click', openEnvelope);
  }

  // Re-open envelope button
  const reopenBtn = document.getElementById('sticky-envelope-btn');
  if (reopenBtn) {
    reopenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (envelopeOverlay && envelopeWrapper) {
        envelopeOverlay.classList.remove('hidden');
        envelopeWrapper.classList.remove('opened');
      }
    });
  }

  function createSparkleBurst() {
    const rect = waxSeal.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 24; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'wax-sparkle';
      sparkle.innerHTML = '✨';
      sparkle.style.position = 'fixed';
      sparkle.style.left = `${centerX}px`;
      sparkle.style.top = `${centerY}px`;
      sparkle.style.zIndex = '100001';
      sparkle.style.pointerEvents = 'none';
      sparkle.style.fontSize = `${Math.random() * 12 + 14}px`;
      sparkle.style.color = '#F3E5AB';
      sparkle.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.appendChild(sparkle);

      const angle = (i / 24) * 2 * Math.PI;
      const distance = Math.random() * 120 + 40;
      const destX = Math.cos(angle) * distance;
      const destY = Math.sin(angle) * distance;

      requestAnimationFrame(() => {
        sparkle.style.transform = `translate(${destX}px, ${destY}px) scale(0)`;
        sparkle.style.opacity = '0';
      });

      setTimeout(() => sparkle.remove(), 900);
    }
  }

  /* ==========================================================================
     3. FALLING PETALS & GOLDEN PARTICLES (CANVAS)
     ========================================================================== */
  const canvas = document.getElementById('petals-canvas');
  let petalsEnabled = true;

  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = 28;

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * -height;
        this.isGold = Math.random() > 0.65;
        this.size = this.isGold ? Math.random() * 3 + 2 : Math.random() * 10 + 9;
        this.speedY = Math.random() * 1.5 + 0.8;
        this.speedX = Math.random() * 1.2 - 0.6;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 2;
        this.opacity = Math.random() * 0.5 + 0.3;
      }
      update() {
        this.y += this.speedY;
        this.x += Math.sin(this.y * 0.01) * 0.8 + this.speedX;
        this.rotation += this.rotationSpeed;
        if (this.y > height + 20) {
          this.reset();
          this.y = -10;
        }
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;

        if (this.isGold) {
          ctx.fillStyle = '#D4AF37';
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#E8A7A1';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-this.size / 2, -this.size / 2, -this.size / 2, this.size / 2, 0, this.size);
          ctx.bezierCurveTo(this.size / 2, this.size / 2, this.size / 2, -this.size / 2, 0, 0);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animateParticles() {
      if (petalsEnabled) {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p) => {
          p.update();
          p.draw();
        });
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      requestAnimationFrame(animateParticles);
    }
    animateParticles();

    const togglePetalsBtn = document.getElementById('toggle-petals-btn');
    if (togglePetalsBtn) {
      togglePetalsBtn.addEventListener('click', () => {
        petalsEnabled = !petalsEnabled;
        togglePetalsBtn.style.opacity = petalsEnabled ? '1' : '0.4';
        showToast(petalsEnabled ? 'Đã bật hiệu ứng hoa rơi' : 'Đã tắt hiệu ứng hoa rơi');
      });
    }
  }

  /* ==========================================================================
     4. COUNTDOWN TIMER
     ========================================================================== */
  const weddingDate = new Date(targetWeddingTime).getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    if (distance <= 0) {
      document.getElementById('days').innerText = '00';
      document.getElementById('hours').innerText = '00';
      document.getElementById('minutes').innerText = '00';
      document.getElementById('seconds').innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const pad = (n) => (n < 10 ? '0' + n : n);

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (daysEl) daysEl.innerText = pad(days);
    if (hoursEl) hoursEl.innerText = pad(hours);
    if (minutesEl) minutesEl.innerText = pad(minutes);
    if (secondsEl) secondsEl.innerText = pad(seconds);
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  /* ==========================================================================
     4.5 STORY MEDIA PRESENTATION MODAL (VIDEO TỎ TÌNH & DẶM NGÕ: VIDEO TRƯỚC + ẢNH SAU)
     ========================================================================== */
  const storyModal = document.getElementById('story-modal');
  const storyModalBackdrop = document.getElementById('story-modal-backdrop');
  const storyModalClose = document.getElementById('story-modal-close');
  const storyModalTag = document.getElementById('story-modal-tag');
  const storyModalTitle = document.getElementById('story-modal-title');
  const storyTrack = document.getElementById('story-track');
  const storyViewport = document.getElementById('story-viewport');
  const storyNavPrev = document.getElementById('story-nav-prev');
  const storyNavNext = document.getElementById('story-nav-next');
  const storyCaption = document.getElementById('story-caption');
  const storyThumbsContainer = document.getElementById('story-thumbs');
  const timelineInteractiveItems = document.querySelectorAll('.timeline-interactive');

  const storyDatasets = {
    totinh: {
      tag: 'KỶ NIỆM TỎ TÌNH • 15.09.2025',
      title: 'Lời Hẹn Ước Đầu Tiên',
      items: [
        { type: 'video', src: 'assets/videos/totinh_video.mp4', poster: 'assets/images/totinh_1.jpg', badge: '🎥 Video Kỷ Niệm 15.09.2025', caption: 'Video Khoảnh Khắc Tỏ Tình Lãng Mạn (15/09/2025)' },
        { type: 'image', src: 'assets/images/totinh_1.jpg', badge: 'Ảnh 01 / 04', caption: 'Khoảnh khắc hạnh phúc ngày em nhận lời yêu' },
        { type: 'image', src: 'assets/images/totinh_2.jpg', badge: 'Ảnh 02 / 04', caption: 'Nụ cười rạng rỡ và ánh mắt đong đầy yêu thương' },
        { type: 'image', src: 'assets/images/totinh_3.jpg', badge: 'Ảnh 03 / 04', caption: 'Bó hoa tươi thắm cùng lời hứa bên nhau trọn đời' },
        { type: 'image', src: 'assets/images/totinh_4.jpg', badge: 'Ảnh 04 / 04', caption: 'Hành trình tình yêu chính thức đơm hoa kết trái' }
      ]
    },
    damngo: {
      tag: 'LỄ DẶM NGÕ • 12.08.2026',
      title: 'Lễ Dặm Ngõ Ấm Cúng',
      items: [
        { type: 'video', src: 'assets/videos/damngo_video.mp4', poster: 'assets/images/damngo_1.jpg', badge: '🎥 Video Lễ Dặm Ngõ 12.08.2026', caption: 'Video Khoảnh Khắc Lễ Dặm Ngõ Ấm Cúng (12/08/2026)' },
        { type: 'image', src: 'assets/images/damngo_1.jpg', badge: 'Ảnh 01 / 06', caption: 'Bó hoa tươi thắm cùng mâm tráp lễ vẹn tròn' },
        { type: 'image', src: 'assets/images/damngo_2.jpg', badge: 'Ảnh 02 / 06', caption: 'Hai gia đình sum họp bên chén trà ấm cúng' },
        { type: 'image', src: 'assets/images/damngo_3.jpg', badge: 'Ảnh 03 / 06', caption: 'Khoảnh khắc chính thức nhận dâu nhận rể trước hai họ' },
        { type: 'image', src: 'assets/images/damngo_4.jpg', badge: 'Ảnh 04 / 06', caption: 'Nụ cười rạng rỡ của đôi uyên ương trong ngày vui' },
        { type: 'image', src: 'assets/images/damngo_5.jpg', badge: 'Ảnh 05 / 06', caption: 'Những lời chúc phúc thân thương từ hai bên gia đình' },
        { type: 'image', src: 'assets/images/damngo_6.jpg', badge: 'Ảnh 06 / 06', caption: 'Kỷ niệm trọn vẹn mở đầu cho ngày chung đôi hạnh phúc' }
      ]
    }
  };

  let activeStoryKey = 'totinh';
  let currentStoryIdx = 0;

  function renderStoryModalContent(key) {
    activeStoryKey = storyDatasets[key] ? key : 'totinh';
    const dataset = storyDatasets[activeStoryKey];

    if (storyModalTag) storyModalTag.innerText = dataset.tag;
    if (storyModalTitle) storyModalTitle.innerText = dataset.title;

    // Render Track Slides
    if (storyTrack) {
      storyTrack.innerHTML = '';
      dataset.items.forEach((item, idx) => {
        const slide = document.createElement('div');
        slide.className = 'story-slide';
        slide.setAttribute('data-type', item.type);
        slide.setAttribute('data-index', idx);

        if (item.type === 'video') {
          slide.innerHTML = `
            <div class="story-media-card">
              <video id="story-video-player" controls playsinline preload="metadata" poster="${item.poster}">
                <source src="${item.src}" type="video/mp4">
                Trình duyệt không hỗ trợ phát video.
              </video>
              <div class="story-media-badge">${item.badge}</div>
            </div>
          `;
        } else {
          slide.innerHTML = `
            <div class="story-media-card">
              <img src="${item.src}" alt="${item.caption}" draggable="false" loading="lazy">
              <div class="story-media-badge">${item.badge}</div>
            </div>
          `;
        }
        storyTrack.appendChild(slide);
      });
    }

    // Render Thumbnails
    if (storyThumbsContainer) {
      storyThumbsContainer.innerHTML = '';
      dataset.items.forEach((item, idx) => {
        const thumbBtn = document.createElement('button');
        thumbBtn.className = `story-thumb-btn ${idx === 0 ? 'active' : ''}`;
        thumbBtn.setAttribute('data-index', idx);
        thumbBtn.setAttribute('aria-label', `Xem mục ${idx + 1}`);

        if (item.type === 'video') {
          thumbBtn.innerHTML = `
            <span class="story-thumb-video-icon">▶</span>
            <img src="${item.poster}" alt="Video">
          `;
        } else {
          thumbBtn.innerHTML = `
            <img src="${item.src}" alt="${item.caption}">
          `;
        }

        thumbBtn.addEventListener('click', () => goToStorySlide(idx));
        storyThumbsContainer.appendChild(thumbBtn);
      });
    }
  }

  function goToStorySlide(index, animate = true) {
    const dataset = storyDatasets[activeStoryKey] || storyDatasets.totinh;
    const totalItems = dataset.items.length;

    if (index < 0) index = totalItems - 1;
    if (index >= totalItems) index = 0;
    currentStoryIdx = index;

    if (storyTrack) {
      storyTrack.style.transition = animate ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
      storyTrack.style.transform = `translateX(-${currentStoryIdx * 100}%)`;
    }

    if (storyCaption && dataset.items[currentStoryIdx]) {
      storyCaption.innerText = dataset.items[currentStoryIdx].caption;
    }

    // Update Thumbnails
    if (storyThumbsContainer) {
      const thumbs = storyThumbsContainer.querySelectorAll('.story-thumb-btn');
      thumbs.forEach((btn, i) => {
        btn.classList.toggle('active', i === currentStoryIdx);
      });
    }

    // Video handling
    const videoEl = document.getElementById('story-video-player');
    if (videoEl) {
      if (currentStoryIdx !== 0) {
        videoEl.pause();
      } else {
        videoEl.play().catch(() => {});
      }
    }
  }

  function nextStorySlide() {
    goToStorySlide(currentStoryIdx + 1);
  }

  function prevStorySlide() {
    goToStorySlide(currentStoryIdx - 1);
  }

  function openStoryModal(storyKey = 'totinh', initialIndex = 0) {
    if (!storyModal) return;
    renderStoryModalContent(storyKey);
    goToStorySlide(initialIndex, false);
    storyModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Auto play video if slide 0
    if (initialIndex === 0) {
      const videoEl = document.getElementById('story-video-player');
      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {});
      }
    }
  }

  function closeStoryModal() {
    if (!storyModal) return;
    storyModal.classList.remove('active');
    document.body.style.overflow = '';
    const videoEl = document.getElementById('story-video-player');
    if (videoEl) {
      videoEl.pause();
    }
  }

  if (storyModalClose) storyModalClose.addEventListener('click', closeStoryModal);
  if (storyModalBackdrop) storyModalBackdrop.addEventListener('click', closeStoryModal);
  if (storyNavPrev) storyNavPrev.addEventListener('click', prevStorySlide);
  if (storyNavNext) storyNavNext.addEventListener('click', nextStorySlide);

  // Attach click listener to timeline items (totinh, damngo, etc.)
  timelineInteractiveItems.forEach((item) => {
    item.addEventListener('click', () => {
      const storyKey = item.getAttribute('data-story') || 'totinh';
      openStoryModal(storyKey, 0); // Always starts with Video first as requested!
    });
  });

  // Touch Swipe & Mouse Drag on Story Modal
  let sStartX = 0;
  let sStartY = 0;
  let sCurrentX = 0;
  let sCurrentY = 0;
  let sIsDragging = false;
  let sIsHorizontal = null;
  let sDragDist = 0;

  if (storyViewport && storyTrack) {
    // Touch
    storyViewport.addEventListener('touchstart', (e) => {
      if (e.target.closest('video')) return; // Allow video native controls
      if (e.touches.length > 1) return;
      const touch = e.touches[0];
      sStartX = touch.clientX;
      sStartY = touch.clientY;
      sCurrentX = sStartX;
      sCurrentY = sStartY;
      sIsDragging = true;
      sIsHorizontal = null;
      sDragDist = 0;
      storyTrack.style.transition = 'none';
    }, { passive: true });

    storyViewport.addEventListener('touchmove', (e) => {
      if (!sIsDragging) return;
      const touch = e.touches[0];
      sCurrentX = touch.clientX;
      sCurrentY = touch.clientY;
      const diffX = sCurrentX - sStartX;
      const diffY = sCurrentY - sStartY;
      sDragDist = diffX;

      if (sIsHorizontal === null) {
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          sIsHorizontal = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (sIsHorizontal) {
        if (e.cancelable) e.preventDefault();
        const basePercent = -currentStoryIdx * 100;
        const viewportWidth = storyViewport.offsetWidth || 1;
        const pixelPercent = (diffX / viewportWidth) * 100;
        storyTrack.style.transform = `translateX(${basePercent + pixelPercent}%)`;
      }
    }, { passive: false });

    storyViewport.addEventListener('touchend', () => {
      if (!sIsDragging) return;
      sIsDragging = false;
      const threshold = 40;

      if (sIsHorizontal && Math.abs(sDragDist) > threshold) {
        if (sDragDist < 0) {
          nextStorySlide();
        } else {
          prevStorySlide();
        }
      } else {
        goToStorySlide(currentStoryIdx, true);
      }
      sIsHorizontal = null;
    });

    // Mouse Drag on Story Modal
    storyViewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('video')) return; // Allow video controls
      if (e.button !== 0) return;
      e.preventDefault();
      sStartX = e.clientX;
      sStartY = e.clientY;
      sCurrentX = sStartX;
      sCurrentY = sStartY;
      sIsDragging = true;
      sDragDist = 0;
      storyTrack.style.transition = 'none';
      storyViewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!sIsDragging) return;
      sCurrentX = e.clientX;
      sCurrentY = e.clientY;
      const diffX = sCurrentX - sStartX;
      sDragDist = diffX;

      const basePercent = -currentStoryIdx * 100;
      const viewportWidth = storyViewport.offsetWidth || 1;
      const pixelPercent = (diffX / viewportWidth) * 100;
      storyTrack.style.transform = `translateX(${basePercent + pixelPercent}%)`;
    });

    window.addEventListener('mouseup', (e) => {
      if (!sIsDragging) return;
      sIsDragging = false;
      storyViewport.style.cursor = '';
      const threshold = 45;

      if (Math.abs(sDragDist) > threshold) {
        if (sDragDist < 0) {
          nextStorySlide();
        } else {
          prevStorySlide();
        }
      } else {
        goToStorySlide(currentStoryIdx, true);
      }
      sDragDist = 0;
    });
  }

  /* ==========================================================================
     5. PHOTO GALLERY: IN-PAGE SLIDER (TOUCH SWIPE & MOUSE DRAG) & LIGHTBOX
     ========================================================================== */
  // Image metadata
  const galleryPhotos = [
    { src: 'assets/images/gallery_1.jpg', caption: 'Ánh mắt trao nhau lời thề nguyện' },
    { src: 'assets/images/gallery_2.jpg', caption: 'Hạnh phúc giản đơn bên cạnh người mình yêu' },
    { src: 'assets/images/gallery_3.jpg', caption: 'Chiếc váy cưới trắng tinh khôi' },
    { src: 'assets/images/gallery_4.jpg', caption: 'Hoàng hôn lãng mạn trên bãi biển' },
    { src: 'assets/images/gallery_5.jpg', caption: 'Nụ cười rạng rỡ của nàng dâu' },
    { src: 'assets/images/gallery_6.jpg', caption: 'Bó hoa cưới ngát hương tình' },
    { src: 'assets/images/gallery_7.jpg', caption: 'Trao nhau nhẫn cưới thiêng liêng' },
    { src: 'assets/images/gallery_8.jpg', caption: 'Cùng nhau bước vào lễ đường' }
  ];

  let currentPhotoIndex = 0;
  const totalPhotos = galleryPhotos.length;

  // In-Page Carousel elements
  const albumTrack = document.getElementById('album-track');
  const albumViewport = document.getElementById('album-viewport');
  const albumBtnPrev = document.getElementById('album-btn-prev');
  const albumBtnNext = document.getElementById('album-btn-next');
  const albumDotsContainer = document.getElementById('album-dots');
  const albumThumbItems = document.querySelectorAll('.album-thumb-item');
  const albumThumbsContainer = document.querySelector('.album-thumbs-container');
  const albumModeSlide = document.getElementById('album-mode-slide');
  const albumModeGrid = document.getElementById('album-mode-grid');
  const albumCarouselWrapper = document.getElementById('album-carousel-wrapper');
  const albumGridWrapper = document.getElementById('album-grid-wrapper');
  const gridItems = document.querySelectorAll('.gallery-grid .gallery-item');

  // Lightbox elements
  const lightbox = document.getElementById('lightbox');
  const lightboxContent = document.querySelector('.lightbox-content');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  // 1. Render Carousel Pagination Dots
  if (albumDotsContainer) {
    albumDotsContainer.innerHTML = '';
    galleryPhotos.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `album-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Xem ảnh số ${idx + 1}`);
      dot.addEventListener('click', () => goToSlide(idx));
      albumDotsContainer.appendChild(dot);
    });
  }

  // 2. Go to Slide function
  function goToSlide(index, animate = true) {
    if (index < 0) index = totalPhotos - 1;
    if (index >= totalPhotos) index = 0;
    currentPhotoIndex = index;

    if (albumTrack) {
      albumTrack.style.transition = animate ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
      albumTrack.style.transform = `translateX(-${currentPhotoIndex * 100}%)`;
    }

    // Update Dots
    if (albumDotsContainer) {
      const dots = albumDotsContainer.querySelectorAll('.album-dot');
      dots.forEach((d, i) => {
        d.classList.toggle('active', i === currentPhotoIndex);
      });
    }

    // Update Thumbnails
    if (albumThumbItems && albumThumbItems.length > 0) {
      albumThumbItems.forEach((t, i) => {
        t.classList.toggle('active', i === currentPhotoIndex);
      });

      // Scroll thumbnail into view smoothly
      const activeThumb = albumThumbItems[currentPhotoIndex];
      if (activeThumb && albumThumbsContainer) {
        const containerWidth = albumThumbsContainer.offsetWidth;
        const thumbLeft = activeThumb.offsetLeft;
        const thumbWidth = activeThumb.offsetWidth;
        albumThumbsContainer.scrollTo({
          left: thumbLeft - (containerWidth / 2) + (thumbWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }

  function nextSlide() {
    goToSlide(currentPhotoIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentPhotoIndex - 1);
  }

  if (albumBtnNext) albumBtnNext.addEventListener('click', (e) => { e.preventDefault(); nextSlide(); });
  if (albumBtnPrev) albumBtnPrev.addEventListener('click', (e) => { e.preventDefault(); prevSlide(); });

  // Thumbnail clicks
  albumThumbItems.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => goToSlide(idx));
  });

  // View Mode Switcher
  function switchToSlideView(index, smoothScroll = false) {
    if (albumModeSlide) albumModeSlide.classList.add('active');
    if (albumModeGrid) albumModeGrid.classList.remove('active');
    if (albumCarouselWrapper) albumCarouselWrapper.style.display = 'block';
    if (albumGridWrapper) albumGridWrapper.style.display = 'none';

    const targetIdx = typeof index === 'number' ? index : currentPhotoIndex;
    goToSlide(targetIdx, false);

    if (smoothScroll && albumCarouselWrapper) {
      const topOffset = albumCarouselWrapper.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  }

  function switchToGridView() {
    if (albumModeGrid) albumModeGrid.classList.add('active');
    if (albumModeSlide) albumModeSlide.classList.remove('active');
    if (albumCarouselWrapper) albumCarouselWrapper.style.display = 'none';
    if (albumGridWrapper) albumGridWrapper.style.display = 'block';
  }

  if (albumModeSlide && albumModeGrid) {
    albumModeSlide.addEventListener('click', () => {
      switchToSlideView(currentPhotoIndex, false);
    });

    albumModeGrid.addEventListener('click', () => {
      switchToGridView();
    });
  }

  // 3. In-Page Carousel Touch Swipe & Mouse Drag Engine
  let cStartX = 0;
  let cStartY = 0;
  let cCurrentX = 0;
  let cCurrentY = 0;
  let cIsDragging = false;
  let cIsHorizontal = null;
  let cDragDistance = 0;

  if (albumViewport && albumTrack) {
    // Touch (Mobile)
    albumViewport.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) return;
      const touch = e.touches[0];
      cStartX = touch.clientX;
      cStartY = touch.clientY;
      cCurrentX = cStartX;
      cCurrentY = cStartY;
      cIsDragging = true;
      cIsHorizontal = null;
      cDragDistance = 0;
      albumTrack.style.transition = 'none';
    }, { passive: true });

    albumViewport.addEventListener('touchmove', (e) => {
      if (!cIsDragging) return;
      const touch = e.touches[0];
      cCurrentX = touch.clientX;
      cCurrentY = touch.clientY;
      const diffX = cCurrentX - cStartX;
      const diffY = cCurrentY - cStartY;
      cDragDistance = diffX;

      if (cIsHorizontal === null) {
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          cIsHorizontal = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (cIsHorizontal) {
        if (e.cancelable) e.preventDefault();
        const basePercent = -currentPhotoIndex * 100;
        const viewportWidth = albumViewport.offsetWidth || 1;
        const pixelPercent = (diffX / viewportWidth) * 100;
        albumTrack.style.transform = `translateX(${basePercent + pixelPercent}%)`;
      }
    }, { passive: false });

    albumViewport.addEventListener('touchend', () => {
      if (!cIsDragging) return;
      cIsDragging = false;
      const threshold = 40; // px

      if (cIsHorizontal && Math.abs(cDragDistance) > threshold) {
        if (cDragDistance < 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      } else {
        goToSlide(currentPhotoIndex, true);
      }
      cIsHorizontal = null;
    });

    // Mouse Drag (Desktop)
    albumViewport.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      cStartX = e.clientX;
      cStartY = e.clientY;
      cCurrentX = cStartX;
      cCurrentY = cStartY;
      cIsDragging = true;
      cDragDistance = 0;
      albumTrack.style.transition = 'none';
      albumViewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!cIsDragging) return;
      cCurrentX = e.clientX;
      cCurrentY = e.clientY;
      const diffX = cCurrentX - cStartX;
      cDragDistance = diffX;

      const basePercent = -currentPhotoIndex * 100;
      const viewportWidth = albumViewport.offsetWidth || 1;
      const pixelPercent = (diffX / viewportWidth) * 100;
      albumTrack.style.transform = `translateX(${basePercent + pixelPercent}%)`;
    });

    window.addEventListener('mouseup', (e) => {
      if (!cIsDragging) return;
      cIsDragging = false;
      albumViewport.style.cursor = '';
      const threshold = 45; // px

      if (Math.abs(cDragDistance) > threshold) {
        if (cDragDistance < 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      } else if (Math.abs(cDragDistance) < 6) {
        // Quick click without drag -> open Lightbox!
        const slide = e.target.closest('.album-slide');
        const idx = slide ? parseInt(slide.getAttribute('data-index') || currentPhotoIndex, 10) : currentPhotoIndex;
        openLightbox(idx);
      } else {
        goToSlide(currentPhotoIndex, true);
      }
      cDragDistance = 0;
    });
  }

  // Grid view clicks: switch to interactive Slide / Trình chiếu mode at clicked photo index
  gridItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      switchToSlideView(index, true);
    });
  });

  // 4. Fullscreen Lightbox logic
  let lbDotsContainer = document.getElementById('lightbox-dots');
  if (!lbDotsContainer && lightboxContent) {
    lbDotsContainer = document.createElement('div');
    lbDotsContainer.id = 'lightbox-dots';
    lbDotsContainer.className = 'lightbox-dots';
    lightboxContent.appendChild(lbDotsContainer);
  }

  function renderLightboxDots() {
    if (!lbDotsContainer) return;
    lbDotsContainer.innerHTML = '';
    galleryPhotos.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `lightbox-dot ${idx === currentPhotoIndex ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Xem ảnh ${idx + 1}`);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx !== currentPhotoIndex) {
          const dir = idx > currentPhotoIndex ? 'next' : 'prev';
          currentPhotoIndex = idx;
          updateLightboxContent(dir);
        }
      });
      lbDotsContainer.appendChild(dot);
    });
  }

  function openLightbox(index) {
    if (typeof index === 'number') {
      currentPhotoIndex = index;
    }
    if (!lightbox) return;
    updateLightboxContent();
    renderLightboxDots();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    if (lightboxImg) {
      lightboxImg.style.transform = '';
      lightboxImg.style.opacity = '1';
    }
    // Sync back in-page carousel to current image
    goToSlide(currentPhotoIndex, false);
  }

  function updateLightboxContent(direction = '') {
    const data = galleryPhotos[currentPhotoIndex];
    if (!data || !lightboxImg) return;

    if (direction) {
      lightboxImg.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      lightboxImg.style.opacity = '0';
      lightboxImg.style.transform = direction === 'next' ? 'translateX(-30px) scale(0.96)' : 'translateX(30px) scale(0.96)';

      setTimeout(() => {
        lightboxImg.src = data.src;
        if (lightboxCaption) {
          lightboxCaption.innerText = `${data.caption} (${currentPhotoIndex + 1}/${totalPhotos})`;
        }
        renderLightboxDots();
        lightboxImg.style.transform = direction === 'next' ? 'translateX(30px) scale(0.96)' : 'translateX(-30px) scale(0.96)';

        requestAnimationFrame(() => {
          lightboxImg.style.opacity = '1';
          lightboxImg.style.transform = 'translateX(0) scale(1)';
        });
      }, 160);
    } else {
      lightboxImg.src = data.src;
      lightboxImg.style.opacity = '1';
      lightboxImg.style.transform = 'translateX(0) scale(1)';
      if (lightboxCaption) {
        lightboxCaption.innerText = `${data.caption} (${currentPhotoIndex + 1}/${totalPhotos})`;
      }
      renderLightboxDots();
    }
  }

  function showNextImage() {
    currentPhotoIndex = (currentPhotoIndex + 1) % totalPhotos;
    updateLightboxContent('next');
  }

  function showPrevImage() {
    currentPhotoIndex = (currentPhotoIndex - 1 + totalPhotos) % totalPhotos;
    updateLightboxContent('prev');
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNextImage(); });
  if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrevImage(); });

  // Lightbox touch & mouse drag
  let lbStartX = 0;
  let lbStartY = 0;
  let lbCurrentX = 0;
  let lbCurrentY = 0;
  let lbIsDragging = false;
  let lbIsHorizontal = null;

  if (lightbox) {
    // Touch
    lightbox.addEventListener('touchstart', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.target.closest('.lightbox-nav') || e.target.closest('.lightbox-close') || e.target.closest('.lightbox-dots')) return;
      const touch = e.touches[0];
      lbStartX = touch.clientX;
      lbStartY = touch.clientY;
      lbCurrentX = lbStartX;
      lbCurrentY = lbStartY;
      lbIsDragging = true;
      lbIsHorizontal = null;
      if (lightboxImg) lightboxImg.style.transition = 'none';
    }, { passive: true });

    lightbox.addEventListener('touchmove', (e) => {
      if (!lbIsDragging) return;
      const touch = e.touches[0];
      lbCurrentX = touch.clientX;
      lbCurrentY = touch.clientY;
      const diffX = lbCurrentX - lbStartX;
      const diffY = lbCurrentY - lbStartY;

      if (lbIsHorizontal === null) {
        if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
          lbIsHorizontal = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (lbIsHorizontal) {
        if (e.cancelable) e.preventDefault();
        if (lightboxImg) {
          lightboxImg.style.transform = `translateX(${diffX}px) scale(${1 - Math.min(Math.abs(diffX) / 1000, 0.08)})`;
          lightboxImg.style.opacity = `${1 - Math.min(Math.abs(diffX) / 600, 0.35)}`;
        }
      }
    }, { passive: false });

    lightbox.addEventListener('touchend', () => {
      if (!lbIsDragging) return;
      lbIsDragging = false;
      const diffX = lbCurrentX - lbStartX;
      const threshold = 45;

      if (lbIsHorizontal && Math.abs(diffX) > threshold) {
        if (diffX < 0) {
          showNextImage();
        } else {
          showPrevImage();
        }
      } else {
        if (lightboxImg) {
          lightboxImg.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
          lightboxImg.style.transform = 'translateX(0) scale(1)';
          lightboxImg.style.opacity = '1';
        }
      }
      lbIsHorizontal = null;
    });

    // Mouse drag on lightbox
    lightbox.addEventListener('mousedown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.target.closest('.lightbox-nav') || e.target.closest('.lightbox-close') || e.target.closest('.lightbox-dots')) return;
      if (e.button !== 0) return;
      lbStartX = e.clientX;
      lbStartY = e.clientY;
      lbCurrentX = lbStartX;
      lbCurrentY = lbStartY;
      lbIsDragging = true;
      if (lightboxImg) {
        lightboxImg.style.transition = 'none';
        lightboxImg.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!lbIsDragging || !lightbox.classList.contains('active')) return;
      lbCurrentX = e.clientX;
      lbCurrentY = e.clientY;
      const diffX = lbCurrentX - lbStartX;

      if (Math.abs(diffX) > 4 && lightboxImg) {
        lightboxImg.style.transform = `translateX(${diffX}px) scale(${1 - Math.min(Math.abs(diffX) / 1200, 0.08)})`;
        lightboxImg.style.opacity = `${1 - Math.min(Math.abs(diffX) / 800, 0.35)}`;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!lbIsDragging) return;
      lbIsDragging = false;
      const diffX = lbCurrentX - lbStartX;
      const threshold = 55;

      if (lightboxImg) {
        lightboxImg.style.cursor = 'grab';
      }

      if (Math.abs(diffX) > threshold) {
        if (diffX < 0) {
          showNextImage();
        } else {
          showPrevImage();
        }
      } else {
        if (lightboxImg) {
          lightboxImg.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
          lightboxImg.style.transform = 'translateX(0) scale(1)';
          lightboxImg.style.opacity = '1';
        }
      }
    });

    lightbox.addEventListener('click', (e) => {
      const diffX = Math.abs(lbCurrentX - lbStartX);
      if (diffX > 10) return;
      if (e.target === lightbox || e.target === lightboxContent) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (storyModal && storyModal.classList.contains('active')) {
      if (e.key === 'Escape') closeStoryModal();
      if (e.key === 'ArrowRight') nextStorySlide();
      if (e.key === 'ArrowLeft') prevStorySlide();
    } else if (lightbox && lightbox.classList.contains('active')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNextImage();
      if (e.key === 'ArrowLeft') showPrevImage();
    } else {
      // In-page carousel keyboard navigation if section is in viewport
      const gallerySection = document.getElementById('gallery');
      if (gallerySection) {
        const rect = gallerySection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          if (e.key === 'ArrowRight') nextSlide();
          if (e.key === 'ArrowLeft') prevSlide();
        }
      }
    }
  });

  /* ==========================================================================
     6. WEDDING GIFT / VIETQR MODAL & COPY ACCOUNT
     ========================================================================== */
  const giftModal = document.getElementById('gift-modal');
  const giftCloseBtn = document.getElementById('gift-close-btn');
  const giftModalTabs = document.getElementById('gift-modal-tabs');
  const giftModalTitle = document.getElementById('gift-modal-title');
  const giftModalSubtitle = document.getElementById('gift-modal-subtitle');
  const tabGroom = document.getElementById('tab-groom');
  const tabBride = document.getElementById('tab-bride');
  const contentGroom = document.getElementById('content-groom');
  const contentBride = document.getElementById('content-bride');

  function setupGiftModalView() {
    const groomDisplayName = (savedConfig.groomName || 'Bá Sang');
    const brideDisplayName = (savedConfig.brideName && savedConfig.brideName !== 'Thị Thương') ? savedConfig.brideName : 'Kiều Thương';

    // 1. Tiệc Nhà Trai (Lễ Vu Quy): Chỉ hiển thị STK Nhà Trai (Chú Rể)
    if (guestEvent === 'vuquy' || (!guestEvent && guestSide === 'groom')) {
      if (giftModalTabs) giftModalTabs.style.display = 'none';
      if (giftModalSubtitle) giftModalSubtitle.innerText = `Mừng Cưới Chú Rể ${groomDisplayName}`;
      if (giftModalTitle) giftModalTitle.innerText = 'HỘP MỪNG CƯỚI (NHÀ TRAI)';
      if (tabGroom) tabGroom.classList.add('active');
      if (tabBride) tabBride.classList.remove('active');
      if (contentGroom) contentGroom.style.display = 'block';
      if (contentBride) contentBride.style.display = 'none';
    }
    // 2. Tiệc Nạp Tài (Nhà Gái): Chỉ hiển thị STK Nhà Gái (Cô Dâu)
    else if (guestEvent === 'naptai' || (!guestEvent && guestSide === 'bride')) {
      if (giftModalTabs) giftModalTabs.style.display = 'none';
      if (giftModalSubtitle) giftModalSubtitle.innerText = `Mừng Cưới Cô Dâu ${brideDisplayName}`;
      if (giftModalTitle) giftModalTitle.innerText = 'HỘP MỪNG CƯỚI (NHÀ GÁI)';
      if (tabBride) tabBride.classList.add('active');
      if (tabGroom) tabGroom.classList.remove('active');
      if (contentBride) contentBride.style.display = 'block';
      if (contentGroom) contentGroom.style.display = 'none';
    }
    // 3. Cả Hai Buổi Lễ hoặc xem chung: Hiển thị cả 2 tab để khách tùy chọn
    else {
      if (giftModalTabs) giftModalTabs.style.display = 'flex';
      if (giftModalSubtitle) giftModalSubtitle.innerText = 'Gửi Lời Chúc & Mừng Cưới';
      if (giftModalTitle) giftModalTitle.innerText = 'HỘP MỪNG CƯỚI';
      if (guestSide === 'bride') {
        if (tabBride) tabBride.classList.add('active');
        if (tabGroom) tabGroom.classList.remove('active');
        if (contentBride) contentBride.style.display = 'block';
        if (contentGroom) contentGroom.style.display = 'none';
      } else {
        if (tabGroom) tabGroom.classList.add('active');
        if (tabBride) tabBride.classList.remove('active');
        if (contentGroom) contentGroom.style.display = 'block';
        if (contentBride) contentBride.style.display = 'none';
      }
    }
  }

  // Khởi tạo hiển thị modal mừng cưới phù hợp với khách
  setupGiftModalView();

  // Trigger buttons
  const openGiftBtns = document.querySelectorAll('.open-gift-modal-btn');
  openGiftBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setupGiftModalView();
      if (giftModal) giftModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  if (giftCloseBtn) {
    giftCloseBtn.addEventListener('click', () => {
      if (giftModal) giftModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  if (giftModal) {
    giftModal.addEventListener('click', (e) => {
      if (e.target === giftModal) {
        giftModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // Tabs toggle
  if (tabGroom && tabBride) {
    tabGroom.addEventListener('click', () => {
      tabGroom.classList.add('active');
      tabBride.classList.remove('active');
      contentGroom.style.display = 'block';
      contentBride.style.display = 'none';
    });

    tabBride.addEventListener('click', () => {
      tabBride.classList.add('active');
      tabGroom.classList.remove('active');
      contentBride.style.display = 'block';
      contentGroom.style.display = 'none';
    });
  }

  // Copy to clipboard
  const copyButtons = document.querySelectorAll('.copy-acc-btn');
  copyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const acc = btn.getAttribute('data-account');
      if (!acc) return;
      navigator.clipboard.writeText(acc).then(() => {
        showToast(`Đã sao chép STK: ${acc}`);
      }).catch(() => {
        const temp = document.createElement('textarea');
        temp.value = acc;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast(`Đã sao chép STK: ${acc}`);
      });
    });
  });

  /* ==========================================================================
     7. RSVP FORM SUBMISSION
     ========================================================================== */
  const rsvpForm = document.getElementById('rsvp-form');
  const attendingRadios = document.querySelectorAll('input[name="rsvp-attending"]');
  const rsvpDetailsWrap = document.getElementById('rsvp-details-wrap');
  const rsvpSubmitBtn = document.getElementById('rsvp-submit-btn');

  function updateRsvpButtonText(isAttending) {
    if (!rsvpSubmitBtn) return;
    if (isAttending) {
      rsvpSubmitBtn.innerHTML = 'Gửi Xác Nhận Tham Dự ❤️';
    } else {
      rsvpSubmitBtn.innerHTML = 'Gửi Lời Chúc Phúc &amp; Hồi Đáp 💐';
    }
  }

  if (attendingRadios && rsvpDetailsWrap) {
    attendingRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.value === 'Không') {
          rsvpDetailsWrap.style.display = 'none';
          updateRsvpButtonText(false);
        } else {
          rsvpDetailsWrap.style.display = 'block';
          updateRsvpButtonText(true);
        }
      });
    });
  }

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('rsvp-name').value.trim();
      const side = document.querySelector('input[name="rsvp-side"]:checked')?.value || 'Nhà Trai';
      const attendingVal = document.querySelector('input[name="rsvp-attending"]:checked')?.value || 'Có';
      const isAttending = attendingVal === 'Có';
      const eventChoice = document.querySelector('input[name="rsvp-event"]:checked')?.value || 'Cả Hai Buổi Lễ';
      const count = document.getElementById('rsvp-count')?.value || '1 người';
      const wish = document.getElementById('rsvp-wish')?.value.trim() || '';

      if (!name) {
        showToast('Vui lòng nhập họ tên của bạn nhé!');
        return;
      }

      const attendingText = isAttending ? 'Có tham dự' : 'Không tham dự';
      const countText = isAttending ? count : '0 người';
      const eventText = isAttending ? eventChoice : 'Không tham dự';

      // Gửi RSVP trực tiếp và duy nhất lên Google Sheets
      sendRsvpToGoogleSheet({
        name,
        side,
        eventChoice: eventText,
        attending: attendingText,
        count: countText,
        wish,
        time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      });

      // 3. Nếu khách có gửi kèm lời chúc, tự động đưa lên Sổ lưu bút (Wishing Wall)
      if (wish) {
        const sideTag = side ? ` (${side})` : '';
        const newWish = {
          name: name + sideTag,
          message: wish,
          time: 'Vừa xong',
        };
        renderWish(newWish, true);
        const curWishes = JSON.parse(localStorage.getItem('wedding_wishes') || '[]');
        curWishes.unshift(newWish);
        localStorage.setItem('wedding_wishes', JSON.stringify(curWishes));
      }

      if (isAttending) {
        showToast(`Cảm ơn ${name} đã xác nhận tham dự! Đôi uyên ương rất vinh hạnh được đón tiếp bạn! ❤️`);
        createConfettiCelebration();
      } else {
        const cfg = JSON.parse(localStorage.getItem('wedding_custom_config') || '{}');
        const grName = cfg.groomName || 'Bá Sang';
        const brName = (cfg.brideName && cfg.brideName !== 'Thị Thương') ? cfg.brideName : 'Kiều Thương';
        showToast(`Cảm ơn ${name} đã gửi hồi đáp và lời chúc phúc tới ${grName} & ${brName}! 💐`);
      }
      rsvpForm.reset();
      if (guestName && rsvpNameInput) {
        rsvpNameInput.value = guestName;
        rsvpNameInput.readOnly = true;
      }
      if (rsvpDetailsWrap) rsvpDetailsWrap.style.display = 'block';
      updateRsvpButtonText(true);
    });
  }

  function createConfettiCelebration() {
    const colors = ['#D4AF37', '#F3E5AB', '#E8A7A1', '#ffffff', '#B8860B'];
    for (let i = 0; i < 40; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.top = '-20px';
      confetti.style.width = `${Math.random() * 8 + 6}px`;
      confetti.style.height = `${Math.random() * 12 + 8}px`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.zIndex = '100030';
      confetti.style.pointerEvents = 'none';
      confetti.style.borderRadius = '2px';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.style.transition = `transform ${Math.random() * 2 + 2}s cubic-bezier(0.25, 1, 0.5, 1), top ${Math.random() * 2 + 2}s cubic-bezier(0.25, 1, 0.5, 1), opacity 1s ease`;
      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.style.top = `${window.innerHeight + 50}px`;
        confetti.style.transform = `rotate(${Math.random() * 720}deg) scale(0.6)`;
      }, 50);

      setTimeout(() => {
        confetti.style.opacity = '0';
        setTimeout(() => confetti.remove(), 1000);
      }, 3000);
    }
  }

  /* ==========================================================================
     8. GUESTBOOK & WISHING WALL
     ========================================================================== */
  const wishForm = document.getElementById('wish-form');
  const wishesWall = document.getElementById('wishes-wall');
  const quickWishBtns = document.querySelectorAll('.quick-wish-btn');
  const wishTextInput = document.getElementById('wish-message');

  quickWishBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (wishTextInput) {
        wishTextInput.value = btn.innerText;
        wishTextInput.focus();
      }
    });
  });

  const defaultWishes = [
    {
      name: 'Nguyễn Thành Nam & Lan Hương',
      message: 'Chúc hai bạn một đời an yên, trăm năm hạnh phúc, cùng nhau vượt qua mọi chặng đường sắp tới thật rực rỡ nhé!',
      time: 'Vừa xong',
    },
    {
      name: 'Vũ Minh Trí (Đồng nghiệp)',
      message: 'Chúc mừng đôi bạn trẻ trai tài gái sắc! Chúc hai bạn sớm đón thêm thiên thần nhỏ đáng yêu!',
      time: '15 phút trước',
    },
    {
      name: 'Hội Bạn Thân Đại Học',
      message: 'Happy Wedding Quân & Yến! Chúc hai đứa trăm năm tình viên mãn, bạc đầu nghĩa phu thê! Tối nay quẩy hết mình nha!',
      time: '1 giờ trước',
    },
  ];

  function renderWish(wish, prepend = false) {
    if (!wishesWall) return;
    const card = document.createElement('div');
    card.className = 'wish-card';
    card.innerHTML = `
      <div class="wish-header">
        <span class="wish-author">${escapeHtml(wish.name)}</span>
        <span class="wish-time">${wish.time}</span>
      </div>
      <p class="wish-text">${escapeHtml(wish.message)}</p>
    `;
    if (prepend) {
      wishesWall.prepend(card);
    } else {
      wishesWall.appendChild(card);
    }
  }

  // 1. Khởi tạo danh sách lời chúc từ cache hoặc mặc định trước
  const storedWishes = JSON.parse(localStorage.getItem('wedding_wishes') || '[]');
  const initialWishes = storedWishes.length > 0 ? storedWishes : defaultWishes;
  initialWishes.forEach((w) => renderWish(w));

  // 2. Đọc realtime lời chúc từ Google Sheet qua GViz API
  function loadWishesFromGoogleSheet() {
    if (!wishesWall || !GOOGLE_SHEET_ID) return;

    const callbackName = 'gvizWishesCallback_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      cleanup();
    }, 8000);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(json) {
      if (timedOut) return;
      cleanup();

      try {
        if (!json || !json.table || !json.table.rows) return;

        const colsHaveLabels = json.table.cols.some(c => c && c.label && c.label.trim());
        const allRows = json.table.rows || [];

        let colNames = [];
        let dataRows = [];

        if (colsHaveLabels) {
          colNames = json.table.cols.map((c, i) => (c && c.label ? c.label.trim() : `col_${i}`));
          dataRows = allRows;
        } else {
          if (allRows.length === 0) return;
          const headerCells = (allRows[0].c || []).map(cell => (cell && cell.v ? String(cell.v).trim() : ''));
          colNames = headerCells.length > 0 ? headerCells : json.table.cols.map((c, i) => `col_${i}`);
          dataRows = allRows.slice(1);
        }

        const HEADER_NAMES = new Set([
          'tên khách', 'họ và tên khách mời', 'tên', 'họ và tên',
          'ten khach', 'ho va ten khach moi', 'ten', 'ho va ten',
          'guest name', 'name'
        ]);

        const sheetWishes = [];

        dataRows.forEach((r, idx) => {
          const cells = (r.c || []).map(cell => (cell && cell.v !== null && cell.v !== undefined ? cell.v : ''));
          const rowObj = {};
          colNames.forEach((colName, cIdx) => {
            rowObj[colName] = cells[cIdx] !== undefined ? cells[cIdx] : '';
          });

          const name = String(rowObj['Tên Khách'] || rowObj['Họ và Tên Khách Mời'] || rowObj['Tên'] || cells[1] || '').trim();
          if (!name || HEADER_NAMES.has(name.toLowerCase())) return;

          const rawSide = String(rowObj['Phía Khách'] || rowObj['Phía'] || cells[2] || '').trim();
          const wish = String(rowObj['Lời Chúc'] || cells[6] || '').trim();
          const time = String(rowObj['Thời Gian Xác Nhận'] || rowObj['Ngày Tạo'] || cells[7] || '').trim();

          if (wish) {
            sheetWishes.push({
              name: rawSide ? `${name} (${rawSide})` : name,
              message: wish,
              time: time || 'Gần đây'
            });
          }
        });

        if (sheetWishes.length > 0) {
          // Đảo ngược để lời chúc mới nhất hiển thị ở trên cùng
          sheetWishes.reverse();
          wishesWall.innerHTML = '';
          sheetWishes.forEach(w => renderWish(w));
          // Lưu cache vào localStorage
          localStorage.setItem('wedding_wishes', JSON.stringify(sheetWishes));
        }
      } catch (err) {
        console.warn('Lỗi phân tích lời chúc từ Google Sheet:', err);
      }
    };

    script.onerror = function() {
      if (timedOut) return;
      cleanup();
      console.warn('Không thể nạp lời chúc từ Google Sheets endpoint');
    };

    script.src = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=RSVP`;
    document.head.appendChild(script);
  }

  // Tải danh sách lời chúc trực tiếp từ Google Sheet khi vào trang
  loadWishesFromGoogleSheet();

  if (wishForm) {
    wishForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('wish-name');
      const name = nameInput ? nameInput.value.trim() : (guestName || 'Khách mời');
      const message = wishTextInput ? wishTextInput.value.trim() : '';

      if (!name || !message) {
        showToast('Vui lòng điền tên và lời chúc của bạn nhé!');
        return;
      }

      const sideTag = guestSide === 'groom' ? ' (Nhà Trai)' : guestSide === 'bride' ? ' (Nhà Gái)' : (guestSide ? ` (${guestSide})` : '');
      const newWish = { name: `${name}${sideTag}`, message, time: 'Vừa xong' };
      renderWish(newWish, true);

      storedWishes.unshift(newWish);
      localStorage.setItem('wedding_wishes', JSON.stringify(storedWishes));

      // ❗ Gửi lời chúc lên Google Sheets
      sendRsvpToGoogleSheet({
        name: name,
        side: guestSide === 'groom' ? 'Nhà Trai' : guestSide === 'bride' ? 'Nhà Gái' : (guestSide || 'Bạn chung'),
        wish: message,
        action: 'wish',
        time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      });

      wishForm.reset();
      // Giữ nguyên tên khách và trạng thái readOnly nếu link có sẵn tên
      if (guestName && nameInput) {
        nameInput.value = guestName;
        nameInput.readOnly = true;
      }
      showToast('Cảm ơn lời chúc ngọt ngào của bạn! Đã ghi nhận vào sổ lưu bút ❤️');
      triggerFlyingHeart();
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  }

  /* ==========================================================================
     9. FLOATING HEART REACTION
     ========================================================================== */
  const heartButton = document.getElementById('heart-btn');
  const heartCountEl = document.getElementById('heart-count');
  let heartCount = parseInt(localStorage.getItem('wedding_hearts') || '389', 10);

  if (heartCountEl) heartCountEl.innerText = `${heartCount} lượt chúc phúc`;

  function triggerFlyingHeart() {
    const container = document.getElementById('heart-container');
    if (!container) return;

    for (let i = 0; i < 6; i++) {
      const heart = document.createElement('div');
      heart.className = 'flying-heart';
      const heartIcons = ['❤️', '💖', '💕', '✨', '🌸', '🥂'];
      heart.innerHTML = heartIcons[Math.floor(Math.random() * heartIcons.length)];

      const xShift = `${(Math.random() - 0.5) * 80}px`;
      const xShiftEnd = `${(Math.random() - 0.5) * 140}px`;
      heart.style.setProperty('--x-shift', xShift);
      heart.style.setProperty('--x-shift-end', xShiftEnd);
      heart.style.left = '50%';
      heart.style.top = '10px';

      container.appendChild(heart);
      setTimeout(() => heart.remove(), 1400);
    }
  }

  if (heartButton) {
    heartButton.addEventListener('click', () => {
      heartCount++;
      localStorage.setItem('wedding_hearts', heartCount);
      if (heartCountEl) heartCountEl.innerText = `${heartCount} lượt chúc phúc`;
      triggerFlyingHeart();
    });
  }

  /* ==========================================================================
     10. TOAST NOTIFICATION UTILITY
     ========================================================================== */
  function showToast(msg) {
    let toast = document.getElementById('toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3200);
  }

  /* ==========================================================================
     11. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
     ========================================================================== */
  const revealElements = document.querySelectorAll('.couple-card, .timeline-item, .event-card, .gallery-item, .rsvp-card');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  revealElements.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
    observer.observe(el);
  });
});
