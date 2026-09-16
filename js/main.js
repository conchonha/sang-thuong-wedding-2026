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
  const guestSide = urlParams.get('side') || '';
  const guestEvent = urlParams.get('event') || '';

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

    const cfg = JSON.parse(localStorage.getItem('wedding_custom_config') || '{}');
    const grName = cfg.groomName || 'Bá Sang';
    const brName = cfg.brideName || 'Thị Thương';
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

  // Load Custom Configuration (Address, Times & Google Maps) from Couple Config
  const savedConfig = JSON.parse(localStorage.getItem('wedding_custom_config') || '{}');

  let targetWeddingTime = '2026-12-20T10:00:00+07:00';
  if (savedConfig.weddingDate) {
    targetWeddingTime = savedConfig.weddingDate;
  }
  if (savedConfig.weddingDateText) {
    const heroDateEl = document.getElementById('hero-date-text');
    if (heroDateEl) heroDateEl.innerText = savedConfig.weddingDateText;
  }

  // Lễ Nạp Tài (Nhà Gái)
  if (savedConfig.naptaiTime) {
    const el = document.getElementById('event-naptai-time');
    if (el) el.innerText = savedConfig.naptaiTime;
  }
  if (savedConfig.naptaiAddress) {
    const el = document.getElementById('event-naptai-address');
    if (el) el.innerText = savedConfig.naptaiAddress;
    const iframe = document.getElementById('event-naptai-iframe');
    if (iframe) iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(savedConfig.naptaiAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }
  if (savedConfig.naptaiMap) {
    const btn = document.getElementById('event-naptai-map-btn');
    const directBtn = document.getElementById('event-naptai-map-direct');
    if (btn) btn.href = savedConfig.naptaiMap;
    if (directBtn) directBtn.href = savedConfig.naptaiMap;
  }

  // Lễ Vu Quy (Nhà Trai)
  if (savedConfig.vuquyTime) {
    const el = document.getElementById('event-vuquy-time');
    if (el) el.innerText = savedConfig.vuquyTime;
  }
  if (savedConfig.vuquyAddress) {
    const el = document.getElementById('event-vuquy-address');
    if (el) el.innerText = savedConfig.vuquyAddress;
    const iframe = document.getElementById('event-vuquy-iframe');
    if (iframe) iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(savedConfig.vuquyAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }
  if (savedConfig.vuquyMap) {
    const btn = document.getElementById('event-vuquy-map-btn');
    const directBtn = document.getElementById('event-vuquy-map-direct');
    if (btn) btn.href = savedConfig.vuquyMap;
    if (directBtn) directBtn.href = savedConfig.vuquyMap;
  }

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

    if (sectionTitle) sectionTitle.innerText = 'LỊCH TRÌNH LỄ VU QUY (NHÀ TRAI)';
    if (sectionSubtitle) {
      sectionSubtitle.innerText = guestSide === 'bride' ? 'Nhà Gái Kính Báo' : 'Nhà Trai Kính Báo';
    }

    if (honorQuote) {
      if (guestSide === 'bride') {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Cô Dâu &amp; Gia Đình Nhà Gái.&rdquo;`;
      } else {
        honorQuote.innerHTML = `&ldquo;Sự hiện diện của <strong>${guestDisplayName}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với Chú Rể &amp; Gia Đình Nhà Trai.&rdquo;`;
      }
    }

    // RSVP: Chỉ hiển thị Lễ Vu Quy
    if (rsvpNapTai) rsvpNapTai.style.display = 'none';
    if (rsvpBoth) rsvpBoth.style.display = 'none';
    if (rsvpVuQuy) rsvpVuQuy.style.display = 'inline-flex';
    const r = document.querySelector('input[name="rsvp-event"][value="Lễ Vu Quy"]');
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
     5. PHOTO GALLERY LIGHTBOX
     ========================================================================== */
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  let currentImageIndex = 0;
  const imageSources = [];

  galleryItems.forEach((item, index) => {
    const img = item.querySelector('img');
    const caption = item.getAttribute('data-caption') || 'Khoảnh khắc ngọt ngào';
    imageSources.push({ src: img.src, caption });

    item.addEventListener('click', () => {
      currentImageIndex = index;
      openLightbox();
    });
  });

  function openLightbox() {
    if (!lightbox) return;
    updateLightboxContent();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateLightboxContent() {
    const data = imageSources[currentImageIndex];
    if (!data) return;
    lightboxImg.src = data.src;
    lightboxCaption.innerText = `${data.caption} (${currentImageIndex + 1}/${imageSources.length})`;
  }

  function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % imageSources.length;
    updateLightboxContent();
  }

  function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + imageSources.length) % imageSources.length;
    updateLightboxContent();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', showNextImage);
  if (lightboxPrev) lightboxPrev.addEventListener('click', showPrevImage);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNextImage();
    if (e.key === 'ArrowLeft') showPrevImage();
  });

  /* ==========================================================================
     6. WEDDING GIFT / VIETQR MODAL & COPY ACCOUNT
     ========================================================================== */
  const giftModal = document.getElementById('gift-modal');
  const giftCloseBtn = document.getElementById('gift-close-btn');
  const tabGroom = document.getElementById('tab-groom');
  const tabBride = document.getElementById('tab-bride');
  const contentGroom = document.getElementById('content-groom');
  const contentBride = document.getElementById('content-bride');

  // Trigger buttons
  const openGiftBtns = document.querySelectorAll('.open-gift-modal-btn');
  openGiftBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (giftModal) giftModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (guestSide === 'bride' && tabBride) {
        tabBride.click();
      } else if (guestSide === 'groom' && tabGroom) {
        tabGroom.click();
      }
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
        const brName = cfg.brideName || 'Thị Thương';
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
