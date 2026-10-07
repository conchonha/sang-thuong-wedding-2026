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
  const rawTypeParam = (urlParams.get('type') || urlParams.get('.type') || urlParams.get('event') || '').trim();

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

  // Dynamic Page Title & OG Title Update
  const dynamicTitle = guestName ? `Trân Trọng Kính Mời: ${guestName}` : 'Trân Trọng Kính Mời';
  document.title = dynamicTitle;
  const ogTitleMeta = document.querySelector('meta[property="og:title"]');
  if (ogTitleMeta) ogTitleMeta.setAttribute('content', dynamicTitle);

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
  const DEFAULT_NAPTAI_TIME = '10:00 • 10.12.2026';
  const DEFAULT_NAPTAI_ADDRESS = 'Số 21 đường số 1 Xóm Thắng Thôn Hà Trung, xã Quảng Đức, huyện Quảng Xương, tỉnh Thanh Hoá';
  const DEFAULT_NAPTAI_MAP = 'https://maps.app.goo.gl/bVgnrTXb4vHFyeZU8';
  const DEFAULT_NAPTAI_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d449.02188624150205!2d105.81176001419148!3d19.712269835962168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313655003102443f%3A0xe13f799bc4613d7e!2zU-G7kSBuaMOgIDIxICzEkcaw4budbmcgc-G7kSAxICx0aMO0biBIw6AgVHJ1bmcsIHjDoyBsxrB1IHbhu4cgLHThu4luaCBUaGFuaCBIw7Nh!5e1!3m2!1svi!2s!4v1791302147748!5m2!1svi!2s';

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

  // 2. Nhà Trai: Lễ Thành Hôn
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
     - guestEvent = 'vuquy': Chỉ hiển thị duy nhất Lễ Thành Hôn (Nhà Trai), ẩn Lễ Nạp Tài.
     - guestEvent = 'naptai': Chỉ hiển thị duy nhất Lễ Nạp Tài (Nhà Gái), ẩn Lễ Thành Hôn.
     - guestEvent = 'all' hoặc rỗng: Hiển thị cả 2 tiệc Lễ Nạp Tài & Lễ Thành Hôn.
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
    // Quyết định: Chỉ hiện Lễ Thành Hôn, ẩn hoàn toàn Lễ Nạp Tài
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
    const r = document.querySelector('input[name="rsvp-event"][value="Lễ Thành Hôn"]') || document.querySelector('input[name="rsvp-event"][value="Lễ Thành Hôn"]');
    if (r) r.checked = true;

  } else if (guestEvent === 'naptai') {
    // === 2. MỜI THAM DỰ LỄ NẠP TÀI (NHÀ GÁI) ===
    // Quyết định: Chỉ hiện Lễ Nạp Tài, ẩn hoàn toàn Lễ Thành Hôn
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
    
    // Cập nhật ngày tháng trên bìa và phần footer cho Nhà Gái
    const heroDateEl = document.getElementById('hero-date-text');
    if (heroDateEl && !savedConfig.weddingDateText) heroDateEl.innerText = 'THỨ NĂM, NGÀY 10 THÁNG 12 NĂM 2026';
    
    const letterDate = document.querySelector('.letter-date');
    if (letterDate) letterDate.innerText = '10 . 12 . 2026';
    
    const footerNote = document.querySelector('.footer-note');
    if (footerNote) footerNote.innerHTML = 'FOREVER &amp; ALWAYS &bull; 10.12.2026';


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
      sparkle.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
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

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 150);
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

    let particleAnimId = null;
    function animateParticles() {
      ctx.clearRect(0, 0, width, height);
      if (!petalsEnabled) {
        particleAnimId = null;
        return;
      }
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      particleAnimId = requestAnimationFrame(animateParticles);
    }
    if (petalsEnabled) animateParticles();

    const togglePetalsBtn = document.getElementById('toggle-petals-btn');
    if (togglePetalsBtn) {
      togglePetalsBtn.addEventListener('click', () => {
        petalsEnabled = !petalsEnabled;
        if (petalsEnabled && !particleAnimId) animateParticles();
        else if (!petalsEnabled) { ctx.clearRect(0, 0, width, height); }
        
        togglePetalsBtn.style.opacity = petalsEnabled ? '1' : '0.4';
        showToast(petalsEnabled ? 'Đã bật hiệu ứng hoa rơi' : 'Đã tắt hiệu ứng hoa rơi');
      });
    }
  }

  /* ==========================================================================
     4. COUNTDOWN TIMER
     ========================================================================== */
  const weddingDate = new Date(targetWeddingTime).getTime();

  const elDays = document.getElementById('days');
  const elHours = document.getElementById('hours');
  const elMins = document.getElementById('minutes');
  const elSecs = document.getElementById('seconds');

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    if (distance <= 0) {
      if (elDays) elDays.innerText = '00';
      if (elHours) elHours.innerText = '00';
      if (elMins) elMins.innerText = '00';
      if (elSecs) elSecs.innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const pad = (n) => (n < 10 ? '0' + n : n);

    if (elDays) elDays.innerText = pad(days);
    if (elHours) elHours.innerText = pad(hours);
    if (elMins) elMins.innerText = pad(minutes);
    if (elSecs) elSecs.innerText = pad(seconds);
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
  let sCachedWidth = 1;
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
        const viewportWidth = sCachedWidth;
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
      sCachedWidth = storyViewport.offsetWidth || 1;
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
      const viewportWidth = sCachedWidth;
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
  // Image metadata - dynamically extracted from gallery grid items
  const galleryPhotos = [];
  document.querySelectorAll('.gallery-grid .gallery-item').forEach((item, i) => {
    const img = item.querySelector('img');
    galleryPhotos.push({
      src: img ? img.getAttribute('src') : '',
      caption: item.getAttribute('data-caption') || ('Ảnh cưới ' + (i + 1))
    });
  });

  // Xáo trộn mảng galleryPhotos (Fisher-Yates shuffle)
  for (let i = galleryPhotos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [galleryPhotos[i], galleryPhotos[j]] = [galleryPhotos[j], galleryPhotos[i]];
  }

  // Cập nhật lại DOM với thứ tự đã xáo trộn
  const tempGridItems = document.querySelectorAll('.gallery-grid .gallery-item');
  const tempSlides = document.querySelectorAll('.album-track .album-slide');
  const tempThumbs = document.querySelectorAll('.album-thumbs-container .album-thumb-item');

  galleryPhotos.forEach((data, i) => {
    // 1. Cập nhật ảnh trong Lưới (Grid)
    if (tempGridItems[i]) {
      tempGridItems[i].setAttribute('data-caption', data.caption);
      const img = tempGridItems[i].querySelector('img');
      if (img) img.setAttribute('src', data.src);
    }
    // 2. Cập nhật ảnh trong Trình Chiếu (Slide)
    if (tempSlides[i]) {
      tempSlides[i].setAttribute('data-caption', data.caption);
      const img = tempSlides[i].querySelector('img');
      if (img) img.setAttribute('src', data.src);
      const captionEl = tempSlides[i].querySelector('.album-slide-caption');
      if (captionEl) captionEl.innerText = data.caption;
    }
    // 3. Cập nhật ảnh Thumbnail
    if (tempThumbs[i]) {
      const img = tempThumbs[i].querySelector('img');
      if (img) img.setAttribute('src', data.src);
    }
  });

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
      if (!albumDotsContainer._cachedDots) albumDotsContainer._cachedDots = albumDotsContainer.querySelectorAll(".album-dot");
      albumDotsContainer._cachedDots.forEach((d, i) => d.classList.toggle("active", i === currentPhotoIndex));

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
      const topOffset = albumCarouselWrapper.getBoundingClientRect().top + window.scrollY - 120;
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
  let cCachedWidth = albumViewport ? albumViewport.offsetWidth : 1;
  let cDragDistance = 0;

  const albumSliderClose = document.getElementById('album-slider-close');
  if (albumSliderClose) albumSliderClose.addEventListener('click', switchToGridView);

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
      cCachedWidth = albumViewport.offsetWidth || 1;
      cDragDistance = 0;
      cCachedWidth = albumViewport.offsetWidth || 1;
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
        const viewportWidth = cCachedWidth;
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
      cCachedWidth = albumViewport.offsetWidth || 1;
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
      cCachedWidth = albumViewport.offsetWidth || 1;
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
      const viewportWidth = cCachedWidth;
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
      cCachedWidth = albumViewport.offsetWidth || 1;
    });
  }

  // Grid view clicks: open the rich slider (Trình chiếu) as a popup modal
  gridItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(index);
    });
  });

  // ═══ LIGHTBOX WITH ZOOM & ADJACENT SLIDES ═══
  const lbSlidePrev = document.getElementById('lb-slide-prev');
  const lbSlideCurrent = document.getElementById('lb-slide-current');
  const lbSlideNext = document.getElementById('lb-slide-next');
  const lbZoomContainer = document.getElementById('lb-zoom-container');
  const lbZoomInfo = document.getElementById('lb-zoom-info');
  const lbSlidePrevImg = lbSlidePrev ? lbSlidePrev.querySelector('img') : null;
  const lbSlideNextImg = lbSlideNext ? lbSlideNext.querySelector('img') : null;

  let lbZoom = 1;
  let lbPanX = 0;
  let lbPanY = 0;
  let lbIsOpen = false;
  let lbHighResLoaded = false;
  let lbHighResLoader = null;

  function getHighResPath(webPath) {
    return webPath.replace('anh-cuoi-web/', 'anh-cuoi/');
  }

  function updateAdjacentSlides() {
    if (!galleryPhotos.length) return;
    const prevIdx = (currentPhotoIndex - 1 + totalPhotos) % totalPhotos;
    const nextIdx = (currentPhotoIndex + 1) % totalPhotos;
    if (lbSlidePrevImg) lbSlidePrevImg.src = galleryPhotos[prevIdx].src;
    if (lbSlideNextImg) lbSlideNextImg.src = galleryPhotos[nextIdx].src;
  }

  function resetZoom() {
    lbZoom = 1;
    lbPanX = 0;
    lbPanY = 0;
    lbHighResLoaded = false;
    isHighResLoading = false;
    if (preloadTimer) clearTimeout(preloadTimer);
    if (lbHighResLoader) { lbHighResLoader.onload = null; lbHighResLoader.onerror = null; lbHighResLoader.src = ''; lbHighResLoader = null; }
    applyZoomTransform();
    if (lbZoomContainer) lbZoomContainer.classList.remove('is-zoomed');
  }

  function applyZoomTransform() {
    if (!lightboxImg) return;
    
    if (lbZoom > 1) {
      lightboxImg.style.width = `${100 * lbZoom}%`;
      lightboxImg.style.height = `${100 * lbZoom}%`;
      lightboxImg.style.maxWidth = 'none';
      lightboxImg.style.maxHeight = 'none';
      lightboxImg.style.transform = `translate(${lbPanX}px, ${lbPanY}px)`;
    } else {
      lightboxImg.style.width = '';
      lightboxImg.style.height = '';
      lightboxImg.style.maxWidth = '100%';
      lightboxImg.style.maxHeight = '100%';
      lightboxImg.style.transform = `translate(${lbPanX}px, ${lbPanY}px)`;
    }

    if (lbZoomInfo) {
      if (isHighResLoading) {
        lbZoomInfo.textContent = `Tải HD... ${lbZoom.toFixed(1)}x`;
      } else {
        lbZoomInfo.textContent = lbZoom.toFixed(1) + 'x';
      }
    }
  }

  let preloadTimer = null;
  let isHighResLoading = false;

  function loadHighResIfNeeded(force = false) {
    if (lbHighResLoaded) return;
    if (!force && lbZoom <= 1) return;
    const currentData = galleryPhotos[currentPhotoIndex];
    if (!currentData) return;
    const highResPath = getHighResPath(currentData.src);
    if (highResPath === currentData.src) return;

    if (isHighResLoading) return;
    isHighResLoading = true;
    applyZoomTransform(); // update text

    lbHighResLoader = new Image();
    const capturedIndex = currentPhotoIndex;
    lbHighResLoader.onload = function() {
      if (lbIsOpen && lightboxImg && currentPhotoIndex === capturedIndex) {
        lightboxImg.src = highResPath;
        lbHighResLoaded = true;
        isHighResLoading = false;
        applyZoomTransform();
      }
    };
    lbHighResLoader.onerror = function() {
      isHighResLoading = false;
      applyZoomTransform();
    };
    lbHighResLoader.src = highResPath;
  }

  function clampPan() {
    if (!lbZoomContainer || !lightboxImg) return;
    const containerRect = lbZoomContainer.getBoundingClientRect();
    const imgW = lightboxImg.naturalWidth || lightboxImg.offsetWidth;
    const imgH = lightboxImg.naturalHeight || lightboxImg.offsetHeight;
    const containerW = containerRect.width;
    const containerH = containerRect.height;
    const scale = Math.min(containerW / imgW, containerH / imgH);
    const displayW = imgW * scale * lbZoom;
    const displayH = imgH * scale * lbZoom;
    const maxPanX = Math.max(0, (displayW - containerW) / 2);
    const maxPanY = Math.max(0, (displayH - containerH) / 2);
    lbPanX = Math.max(-maxPanX, Math.min(maxPanX, lbPanX));
    lbPanY = Math.max(-maxPanY, Math.min(maxPanY, lbPanY));
  }

  function setZoom(newZoom, centerX, centerY) {
    const oldZoom = lbZoom;
    lbZoom = Math.max(1, Math.min(8, newZoom));
    if (lbZoom === 1) {
      lbPanX = 0;
      lbPanY = 0;
      if (lbZoomContainer) lbZoomContainer.classList.remove('is-zoomed');
      const currentData = galleryPhotos[currentPhotoIndex];
      if (currentData && lightboxImg && lbHighResLoaded) {
        lightboxImg.src = currentData.src;
        lbHighResLoaded = false;
      }
    } else {
      if (lbZoomContainer) lbZoomContainer.classList.add('is-zoomed');
      if (centerX !== undefined && centerY !== undefined && lbZoomContainer) {
        const rect = lbZoomContainer.getBoundingClientRect();
        const cx = centerX - rect.left - rect.width / 2;
        const cy = centerY - rect.top - rect.height / 2;
        const zoomRatio = lbZoom / oldZoom;
        lbPanX = cx - (cx - lbPanX) * zoomRatio;
        lbPanY = cy - (cy - lbPanY) * zoomRatio;
      }
      clampPan();
      loadHighResIfNeeded();
    }
    applyZoomTransform();
  }

  function openLightbox(index) {
    if (typeof index === 'number') currentPhotoIndex = index;
    if (!lightbox || !galleryPhotos.length) return;
    const data = galleryPhotos[currentPhotoIndex];
    if (!data) return;
    resetZoom();
    lightboxImg.src = getHighResPath(data.src);
    if (lightboxCaption) lightboxCaption.innerText = `${data.caption} (${currentPhotoIndex + 1}/${totalPhotos})`;
    updateAdjacentSlides();
    lightbox.classList.add('active');
    lbIsOpen = true;
    document.body.style.overflow = 'hidden';
    lbHighResLoaded = true;
  }

  function closeLightbox() {
    if (!lightbox) return;
    resetZoom();
    lightbox.classList.remove('active');
    lbIsOpen = false;
    if (albumCarouselWrapper && albumCarouselWrapper.classList.contains('active')) {
      // Keep overflow hidden for slider modal
    } else {
      document.body.style.overflow = '';
    }
    goToSlide(currentPhotoIndex, false);
  }

  function navigateLightbox(direction) {
    if (!galleryPhotos.length) return;
    resetZoom();
    if (direction === 'next') {
      currentPhotoIndex = (currentPhotoIndex + 1) % totalPhotos;
    } else {
      currentPhotoIndex = (currentPhotoIndex - 1 + totalPhotos) % totalPhotos;
    }
    const data = galleryPhotos[currentPhotoIndex];
    if (!data) return;
    lightboxImg.src = getHighResPath(data.src);
    if (lightboxCaption) lightboxCaption.innerText = `${data.caption} (${currentPhotoIndex + 1}/${totalPhotos})`;
    updateAdjacentSlides();
    lbHighResLoaded = true;
  }

  function showNextImage() { navigateLightbox('next'); }
  function showPrevImage() { navigateLightbox('prev'); }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNextImage(); });
  if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrevImage(); });
  if (lbSlidePrev) lbSlidePrev.addEventListener('click', () => showPrevImage());
  if (lbSlideNext) lbSlideNext.addEventListener('click', () => showNextImage());

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (lbZoom > 1) return;
      if (e.target === lightbox) closeLightbox();
    });
  }

  // ── MOUSE WHEEL ZOOM ──
  if (lbZoomContainer) {
    lbZoomContainer.addEventListener('wheel', (e) => {
      if (!lbIsOpen) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      setZoom(lbZoom + delta, e.clientX, e.clientY);
    }, { passive: false });

    // ── DOUBLE CLICK TO TOGGLE ZOOM ──
    lbZoomContainer.addEventListener('dblclick', (e) => {
      if (!lbIsOpen) return;
      e.preventDefault();
      if (lbZoom > 1) setZoom(1);
      else setZoom(3, e.clientX, e.clientY);
    });

    // ── MOUSE DRAG TO PAN / SWIPE ──
    let lbMouseDown = false;
    let lbMStartX = 0, lbMStartY = 0;
    let lbMStartPanX = 0, lbMStartPanY = 0;
    let lbMMoved = false;

    lbZoomContainer.addEventListener('mousedown', (e) => {
      if (!lbIsOpen || e.button !== 0) return;
      e.preventDefault();
      lbMouseDown = true;
      lbMMoved = false;
      lbMStartX = e.clientX;
      lbMStartY = e.clientY;
      lbMStartPanX = lbPanX;
      lbMStartPanY = lbPanY;
      lbZoomContainer.classList.add('is-grabbing');
    });

    window.addEventListener('mousemove', (e) => {
      if (!lbMouseDown || !lbIsOpen) return;
      const dx = e.clientX - lbMStartX;
      const dy = e.clientY - lbMStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) lbMMoved = true;
      if (lbZoom > 1) {
        lbPanX = lbMStartPanX + dx;
        lbPanY = lbMStartPanY + dy;
        clampPan();
        applyZoomTransform();
      } else if (lbMMoved && lightboxImg) {
        lightboxImg.style.transform = `translateX(${dx}px) scale(${1 - Math.min(Math.abs(dx) / 1200, 0.06)})`;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!lbMouseDown) return;
      lbMouseDown = false;
      lbZoomContainer.classList.remove('is-grabbing');
      if (lbZoom <= 1 && lbMMoved) {
        const dx = e.clientX - lbMStartX;
        if (Math.abs(dx) > 50) {
          if (dx < 0) showNextImage();
          else showPrevImage();
        } else {
          applyZoomTransform();
        }
      }
    });

    // ── TOUCH: PINCH ZOOM + PAN + SWIPE ──
    let lbPinchStartDist = 0;
    let lbPinchStartZoom = 1;
    let lbTStartX = 0, lbTStartY = 0;
    let lbTStartPanX = 0, lbTStartPanY = 0;
    let lbTMoved = false;
    let lbIsPinching = false;

    function getTouchDist(t1, t2) {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    lbZoomContainer.addEventListener('touchstart', (e) => {
      if (!lbIsOpen) return;
      lbTMoved = false;
      if (e.touches.length === 2) {
        lbIsPinching = true;
        lbPinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
        lbPinchStartZoom = lbZoom;
      } else if (e.touches.length === 1) {
        lbIsPinching = false;
        lbTStartX = e.touches[0].clientX;
        lbTStartY = e.touches[0].clientY;
        lbTStartPanX = lbPanX;
        lbTStartPanY = lbPanY;
      }
    }, { passive: true });

    lbZoomContainer.addEventListener('touchmove', (e) => {
      if (!lbIsOpen) return;
      lbTMoved = true;
      if (e.touches.length === 2 && lbIsPinching) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const newZoom = lbPinchStartZoom * (dist / lbPinchStartDist);
        setZoom(newZoom, cx, cy);
      } else if (e.touches.length === 1 && !lbIsPinching) {
        const dx = e.touches[0].clientX - lbTStartX;
        const dy = e.touches[0].clientY - lbTStartY;
        if (lbZoom > 1) {
          e.preventDefault();
          lbPanX = lbTStartPanX + dx;
          lbPanY = lbTStartPanY + dy;
          clampPan();
          applyZoomTransform();
        }
      }
    }, { passive: false });

    lbZoomContainer.addEventListener('touchend', (e) => {
      if (!lbIsOpen) return;
      if (lbIsPinching && e.touches.length < 2) {
        lbIsPinching = false;
        if (e.touches.length === 1) {
          lbTStartX = e.touches[0].clientX;
          lbTStartY = e.touches[0].clientY;
          lbTStartPanX = lbPanX;
          lbTStartPanY = lbPanY;
        }
        return;
      }
      if (lbZoom <= 1 && lbTMoved && e.touches.length === 0) {
        const dx = e.changedTouches[0].clientX - lbTStartX;
        if (Math.abs(dx) > 40) {
          if (dx < 0) showNextImage();
          else showPrevImage();
        }
      }
    }, { passive: true });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (storyModal && storyModal.classList.contains('active')) {
      if (e.key === 'Escape') closeStoryModal();
      if (e.key === 'ArrowRight') nextStorySlide();
      if (e.key === 'ArrowLeft') prevStorySlide();
    } else if (lbIsOpen) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNextImage();
      if (e.key === 'ArrowLeft') showPrevImage();
      if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(lbZoom + 0.5); }
      if (e.key === '-') { e.preventDefault(); setZoom(lbZoom - 0.5); }
      if (e.key === '0') { e.preventDefault(); setZoom(1); }
    } else {
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

    // 1. Tiệc Nhà Trai (Lễ Thành Hôn): Chỉ hiển thị STK Nhà Trai (Chú Rể)
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
      
      const initialRotation = Math.random() * 360;
      confetti.style.transform = `rotate(${initialRotation}deg) translateY(0)`;
      const duration = Math.random() * 2 + 2;
      confetti.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.5, 1), opacity ${duration/2}s ease ${duration/2}s`;
      document.body.appendChild(confetti);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          confetti.style.transform = `rotate(${initialRotation + Math.random() * 720}deg) translateY(${window.innerHeight + 50}px) scale(0.6)`;
          confetti.style.opacity = '0';
        });
      });

      setTimeout(() => confetti.remove(), duration * 1000 + 500);
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
          const frag = document.createDocumentFragment();
          sheetWishes.forEach(w => {
            const card = document.createElement('div');
            card.className = 'wish-card';
            card.innerHTML = `<div class="wish-header"><span class="wish-author">${escapeHtml(w.name)}</span><span class="wish-time">${w.time}</span></div><p class="wish-text">${escapeHtml(w.message)}</p>`;
            frag.appendChild(card);
          });
          wishesWall.appendChild(frag);
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
