/**
 * ADMIN DASHBOARD ENGINE
 * For Bride & Groom management of guests, links, locations, maps, and RSVPs.
 */

// ══ Cấu hình Google Sheets (phải khớp với main.js) ══
const GOOGLE_SHEET_ID = '1JlN1-utEeoLThwzfsyvnNNIDQovqeocbMTEq_NSeWo4';
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycby8nR8gwv5-nmyktlS0NtdiX4psLWjf-WCHxmw1hGawlIBWbhaLJsFwRaTRJLn5Q1Bl/exec';

document.addEventListener('DOMContentLoaded', () => {
  const PIN_CODE = '123456';
  const pinScreen = document.getElementById('pin-screen');
  const adminDashboard = document.getElementById('admin-dashboard');
  const pinForm = document.getElementById('pin-form');
  const pinInput = document.getElementById('pin-input');
  const logoutBtn = document.getElementById('admin-logout-btn');

  /* ==========================================================================
     1. PIN AUTHENTICATION
     ========================================================================== */
  function checkAuth() {
    const isAuthed = sessionStorage.getItem('wedding_admin_auth') === 'true';
    if (isAuthed) {
      pinScreen.style.display = 'none';
      adminDashboard.style.display = 'block';
      initDashboard();
    } else {
      pinScreen.style.display = 'flex';
      adminDashboard.style.display = 'none';
      if (pinInput) pinInput.focus();
    }
  }

  if (pinForm) {
    pinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPin = pinInput.value.trim();
      if (enteredPin === PIN_CODE) {
        sessionStorage.setItem('wedding_admin_auth', 'true');
        showToast('Đăng nhập thành công!');
        checkAuth();
      } else {
        showToast('Mã PIN không đúng! Vui lòng thử lại.');
        pinInput.value = '';
        pinInput.focus();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('wedding_admin_auth');
      checkAuth();
    });
  }

  /* ==========================================================================
     2. TAB NAVIGATION & DATA
     ========================================================================== */

  // ══ NGUỒN DỮ LIỆU DUY NHẤT: phải khai báo TRƯỚC checkAuth() ══
  let liveGuests = [];
  let activeSide = '';

  // Dọn dẹp dữ liệu cũ trong localStorage
  try {
    localStorage.removeItem('wedding_guests_list');
    localStorage.removeItem('wedding_rsvp');
  } catch (e) {}

  checkAuth();

  // ─── Helpers & Functions ────────────────────────────────────────────────────

  function initDashboard() {
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tabContents.forEach((c) => (c.style.display = 'none'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.style.display = 'block';

        if (targetId === 'tab-rsvp') {
          renderRsvpList();
        }
      });
    });

    initGuestGenerator();
    initConfigManager();
    initExcelAndRepoHandlers();

    // Nạp dữ liệu khách từ Google Sheets
    loadGuestsFromGoogleSheet();
    renderRsvpList();

  }

  /* ==========================================================================
     3. GUEST LINK GENERATOR & LIST
     ========================================================================== */
  function getBaseUrl() {
    const origin = window.location.origin;
    let path = window.location.pathname;

    // Loại bỏ admin.html, /admin/, /admin/index.html
    path = path.replace(/\/admin(\.html|\/index\.html|\/)?$/, '');
    path = path.replace(/\/index\.html$/, '');
    path = path.replace(/\/$/, '');

    return `${origin}${path}/index.html`;
  }

  function updateSideFilterCounts() {
    const counts = { '': liveGuests.length, groom: 0, bride: 0, both: 0 };
    liveGuests.forEach(g => {
      if (g.side === 'groom') counts.groom++;
      else if (g.side === 'bride') counts.bride++;
      else counts.both++;
    });
    const map = { '': 'all', groom: 'groom', bride: 'bride', both: 'both' };
    Object.entries(map).forEach(([side, id]) => {
      const el = document.getElementById('filter-count-' + id);
      if (el) el.textContent = counts[side] ?? 0;
    });
  }

  function initGuestGenerator() {
    const guestForm = document.getElementById('guest-create-form');
    const resultBox = document.getElementById('guest-result-box');
    const resultGuestName = document.getElementById('result-guest-name');
    const resultLinkInput = document.getElementById('result-link-input');
    const resultMessageText = document.getElementById('result-message-text');
    const invitePreviewHtml = document.getElementById('invite-preview-html');
    const resultBadgeSide = document.getElementById('result-badge-side');
    const resultBadgeEvent = document.getElementById('result-badge-event');
    const btnShareZalo = document.getElementById('btn-share-zalo');
    const btnShareMessenger = document.getElementById('btn-share-messenger');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnCopyMsg = document.getElementById('btn-copy-message');
    const btnPreview = document.getElementById('btn-open-preview');
    const searchInput = document.getElementById('search-guest-input');
    const sideSelect = document.getElementById('guest-side');
    const eventSelect = document.getElementById('guest-event');

    // Modal Cảnh Báo Trùng Khách
    const modalDup = document.getElementById('modal-duplicate-guest');
    const dupGuestName = document.getElementById('dup-guest-name');
    const dupInfoName = document.getElementById('dup-info-name');
    const dupInfoSide = document.getElementById('dup-info-side');
    const dupInfoEvent = document.getElementById('dup-info-event');
    const dupInfoLink = document.getElementById('dup-info-link');
    const btnDupCopyLink = document.getElementById('btn-dup-copy-link');
    const btnDupClose = document.getElementById('btn-dup-close');
    let currentDupGuest = null;

    if (!guestForm) return;

    // Gợi ý tiệc mời theo bên nhưng luôn giữ đầy đủ 3 lựa chọn để người dùng tự do quyết định
    function updateEventOptions() {
      if (!sideSelect || !eventSelect) return;
      eventSelect.innerHTML = `
        <option value="vuquy">Lễ Vu Quy (Nhà Trai)</option>
        <option value="naptai">Lễ Nạp Tài (Nhà Gái)</option>
        <option value="all">Cả Hai Buổi Lễ (Lễ Nạp Tài &amp; Lễ Vu Quy)</option>
      `;
      const currentSide = sideSelect.value;
      if (currentSide === 'groom') {
        eventSelect.value = 'vuquy';
      } else if (currentSide === 'bride') {
        eventSelect.value = 'naptai';
      } else {
        eventSelect.value = 'all';
      }
    }

    if (sideSelect) {
      sideSelect.addEventListener('change', updateEventOptions);
      updateEventOptions();
    }

    // Hiển thị kết quả thiệp mời và mẫu tin nhắn
    function displayGuestResult(guest) {
      const { name, side, eventChoice, link } = guest;
      const coupleNames = 'Minh Quân & Hoàng Yến';
      let eventText = 'Cả Hai Buổi Lễ (Lễ Nạp Tài & Lễ Vu Quy)';
      let eventTitleShort = 'Cả Hai Buổi Lễ';
      if (eventChoice === 'vuquy') {
        eventText = 'Lễ Vu Quy tại Tư gia Nhà Trai';
        eventTitleShort = 'Lễ Vu Quy (Nhà Trai)';
      } else if (eventChoice === 'naptai') {
        eventText = 'Lễ Nạp Tài tại Tư gia Nhà Gái';
        eventTitleShort = 'Lễ Nạp Tài (Nhà Gái)';
      }

      let familyText = 'đôi bạn trẻ và hai bên gia đình';
      let sideTitleShort = 'Bạn chung';
      if (side === 'groom') {
        familyText = 'Chú Rể & Gia Đình Nhà Trai';
        sideTitleShort = 'Nhà Trai';
      } else if (side === 'bride') {
        familyText = 'Cô Dâu & Gia Đình Nhà Gái';
        sideTitleShort = 'Nhà Gái';
      }

      const plainMsg = `Trân trọng kính mời ${name} tới tham dự ${eventText} của ${coupleNames}!

Sự hiện diện của ${name} là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với ${familyText}.

📍 Kính mời ${name} xem thiệp mời riêng và thông tin bản đồ chỉ đường tại:
👉 ${link}`;

      const htmlPreview = `
        <div style="font-size: 0.96rem; line-height: 1.7; color: #2e2620;">
          <p style="margin-bottom: 12px;">
            Trân trọng kính mời <strong style="color: var(--gold-dark); font-size: 1.05rem;">${escapeHtml(name)}</strong> tới tham dự <strong style="color: #b7791f;">${escapeHtml(eventText)}</strong> của <strong style="color: var(--gold-dark); font-family: var(--font-serif); font-size: 1.1rem;">${coupleNames}</strong>!
          </p>
          <p style="margin-bottom: 12px; color: #4a3e35;">
            Sự hiện diện của <strong style="color: var(--gold-dark);">${escapeHtml(name)}</strong> là niềm vinh hạnh và hạnh phúc lớn lao nhất đối với <strong>${escapeHtml(familyText)}</strong>.
          </p>
          <p style="margin-bottom: 8px; color: #4a3e35;">
            📍 Kính mời <strong>${escapeHtml(name)}</strong> xem thiệp mời riêng và thông tin bản đồ chỉ đường tại:
          </p>
          <div style="background: #fff9f0; border: 1px dashed var(--gold-primary); border-radius: 8px; padding: 10px 14px; word-break: break-all; font-weight: 600;">
            👉 <a href="${link}" target="_blank" style="color: var(--gold-dark); text-decoration: underline;">${escapeHtml(link)}</a>
          </div>
        </div>
      `;

      resultBox.style.display = 'block';
      if (resultGuestName) resultGuestName.innerText = name;
      if (resultLinkInput) resultLinkInput.value = link;
      if (resultMessageText) resultMessageText.value = plainMsg;
      if (invitePreviewHtml) invitePreviewHtml.innerHTML = htmlPreview;
      if (resultBadgeSide) resultBadgeSide.innerText = sideTitleShort;
      if (resultBadgeEvent) resultBadgeEvent.innerText = eventTitleShort;
      if (btnPreview) btnPreview.href = link;

      // Tự động rút gọn link ngay sau khi hiển thị kết quả (truyền thêm tên khách để tạo alias đẹp và kiểm tra link đã lưu)
      applyShortLinkToResultBox(link, name, guest);
    }

    // Hiển thị Dialog cảnh báo nếu khách đã tồn tại trong Excel / danh sách
    function showDuplicateGuestDialog(guest) {
      currentDupGuest = guest;
      if (!modalDup) {
        showToast(`Khách mời "${guest.name}" đã được tạo link trước đó rồi!`);
        return;
      }

      const sideText = guest.side === 'groom' ? 'Nhà Trai' : guest.side === 'bride' ? 'Nhà Gái' : 'Bạn chung';
      const eventText = guest.eventChoice === 'vuquy'
        ? 'Lễ Vu Quy (Nhà Trai)'
        : guest.eventChoice === 'naptai'
          ? 'Lễ Nạp Tài (Nhà Gái)'
          : 'Cả Hai Buổi Lễ';

      if (dupGuestName) dupGuestName.innerText = guest.name;
      if (dupInfoName) dupInfoName.innerText = guest.name;
      if (dupInfoSide) dupInfoSide.innerText = sideText;
      if (dupInfoEvent) dupInfoEvent.innerText = eventText;
      if (dupInfoLink) {
        dupInfoLink.href = guest.link;
        dupInfoLink.innerText = guest.link;
      }

      modalDup.classList.add('active');

      // Nhấp nháy dòng khách trong bảng
      const existingRow = document.getElementById('guest-row-' + guest.id);
      if (existingRow) {
        existingRow.classList.add('guest-row-highlight');
        setTimeout(() => {
          existingRow.classList.remove('guest-row-highlight');
        }, 5000);
      }
    }

    // Xử lý nút trong Dialog Cảnh Báo Trùng
    if (btnDupClose && !btnDupClose.dataset.bound) {
      btnDupClose.dataset.bound = 'true';
      btnDupClose.addEventListener('click', () => {
        if (modalDup) modalDup.classList.remove('active');
      });
    }

    if (modalDup && !modalDup.dataset.bound) {
      modalDup.dataset.bound = 'true';
      modalDup.addEventListener('click', (e) => {
        if (e.target === modalDup) {
          modalDup.classList.remove('active');
        }
      });
    }

    if (btnDupCopyLink && !btnDupCopyLink.dataset.bound) {
      btnDupCopyLink.dataset.bound = 'true';
      btnDupCopyLink.addEventListener('click', () => {
        if (modalDup) modalDup.classList.remove('active');
        if (currentDupGuest) {
          displayGuestResult(currentDupGuest);
          copyText(currentDupGuest.link, 'Đã lấy lại link và tin nhắn của khách mời này! 🔗');
          resultBox.scrollIntoView({ behavior: 'smooth' });

          const row = document.getElementById('guest-row-' + currentDupGuest.id);
          if (row) {
            row.classList.add('guest-row-highlight');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => row.classList.remove('guest-row-highlight'), 5000);
          }
        }
      });
    }

    // 🔍 Hàm chuẩn hoá tên tiếng Việt và kiểm tra trùng — khai báo ở scope ngoài
    const normalizeVietnamese = (str) => {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const isExactNameMatching = (name1, name2) => {
      if (!name1 || !name2) return false;
      const n1 = name1.toLowerCase().replace(/\s+/g, ' ').trim();
      const n2 = name2.toLowerCase().replace(/\s+/g, ' ').trim();
      if (n1 === n2) return true;
      const v1 = normalizeVietnamese(name1);
      const v2 = normalizeVietnamese(name2);
      return v1 === v2 && v1.length > 0;
    };

    // Xử lý gửi Form tạo link khách
    guestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const name = document.getElementById('guest-name').value.trim();
        const side = document.getElementById('guest-side').value;
        const eventChoice = document.getElementById('guest-event').value;
        const note = document.getElementById('guest-note').value.trim();

        console.log('[Admin] Form submit:', { name, side, eventChoice, note });

        if (!name) {
          showToast('⚠️ Vui lòng nhập tên khách mời!');
          document.getElementById('guest-name').focus();
          return;
        }

        const guests = liveGuests;
        const existingGuest = guests.find((g) => isExactNameMatching(name, g.name));

        if (existingGuest) {
          // Đã tạo trước đó: KHÔNG ĐƯỢC TẠO NỮA, báo dialog cảnh báo!
          showDuplicateGuestDialog(existingGuest);
          return;
        }

        const baseUrl = getBaseUrl();
        const fullLink = `${baseUrl}?to=${encodeURIComponent(name)}&side=${side}&event=${eventChoice}`;

        const newGuest = {
          id: Date.now(),
          name,
          side,
          eventChoice,
          note,
          link: fullLink,
          attending: 'Chưa phản hồi',
          rsvpCount: '',
          wish: '',
          createdAt: new Date().toLocaleDateString('vi-VN'),
        };

        console.log('[Admin] Tạo khách mới:', newGuest);

        // Cập nhật giao diện khung kết quả
        displayGuestResult(newGuest);

        // Lưu khách mới vào danh sách hiển thị
        liveGuests.unshift(newGuest);

        renderGuestTable();
        renderRsvpList();
        showToast(`Đã tạo thành công thiệp riêng cho ${name}! ✨`);

        // Gửi khách mới lên Google Sheet (fire-and-forget)
        sendGuestToGoogleSheet(newGuest);

        // Cuộn đến khung kết quả
        resultBox.scrollIntoView({ behavior: 'smooth' });

      } catch (err) {
        console.error('[Admin] Lỗi khi tạo link khách:', err);
        showToast('Có lỗi xảy ra khi tạo link: ' + err.message);
      }
    });

    // 1. Chia sẻ qua Zalo: Tự động sao chép tin nhắn và mở Zalo
    if (btnShareZalo) {
      btnShareZalo.addEventListener('click', () => {
        const text = resultMessageText ? resultMessageText.value : '';
        copyText(text, 'Đã sao chép tin nhắn mời! Đang mở Zalo để bạn dán gửi...');
        setTimeout(() => {
          window.open('https://chat.zalo.me/', '_blank');
        }, 400);
      });
    }

    // 2. Chia sẻ qua Facebook Messenger: Tự động sao chép tin nhắn và mở Messenger
    if (btnShareMessenger) {
      btnShareMessenger.addEventListener('click', () => {
        const text = resultMessageText ? resultMessageText.value : '';
        copyText(text, 'Đã sao chép tin nhắn mời! Đang mở Messenger để bạn dán gửi...');
        setTimeout(() => {
          window.open('https://m.me/', '_blank');
        }, 400);
      });
    }

    // 3. Sao chép mẫu tin nhắn kèm link
    if (btnCopyMsg) {
      btnCopyMsg.addEventListener('click', () => {
        const text = resultMessageText ? resultMessageText.value : '';
        copyText(text, 'Đã sao chép toàn bộ mẫu tin nhắn kèm link thiệp! 💬');
      });
    }

    // 4. Chỉ sao chép đường link thiệp riêng
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', () => {
        const link = resultLinkInput ? resultLinkInput.value : '';
        copyText(link, 'Đã sao chép đường link thiệp! 🔗');
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderGuestTable(e.target.value.trim());
      });
    }

    document.querySelectorAll('.btn-filter-side').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSide = btn.getAttribute('data-side');
        document.querySelectorAll('.btn-filter-side').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const q = document.getElementById('search-guest-input')?.value.trim() || '';
        renderGuestTable(q);
      });
    });
  }

  /* ==========================================================================
     CSV PARSER HELPER & EXCEL LOADER
     ========================================================================== */
  function parseCsvRows(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    const lines = [];
    let row = [];
    let inQuotes = false;
    let currentField = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(currentField.trim());
          currentField = '';
        } else if (char === '\r') {
          // ignore CR
        } else if (char === '\n') {
          row.push(currentField.trim());
          if (row.some((f) => f !== '')) lines.push(row);
          row = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
    }
    if (currentField !== '' || row.length > 0) {
      row.push(currentField.trim());
      if (row.some((f) => f !== '')) lines.push(row);
    }
    return lines;
  }

  function parseGuestRowsFromCsv(rows, baseUrl) {
    if (rows.length <= 1) return [];
    const headerRow = rows[0].map((h) => (h || '').toLowerCase().trim());
    const nameIdx = headerRow.findIndex((h) => h.includes('tên') || h.includes('họ'));
    const sideIdx = headerRow.findIndex((h) => h.includes('phía') || h.includes('bên'));
    const eventIdx = headerRow.findIndex((h) => h.includes('tiệc'));
    const attendingIdx = headerRow.findIndex((h) => h.includes('trạng thái') || h.includes('tham dự') || h.includes('có đi'));
    const countIdx = headerRow.findIndex((h) => h.includes('số người') || h.includes('người đi'));
    const wishIdx = headerRow.findIndex((h) => h.includes('lời chúc') || h.includes('chúc'));
    const noteIdx = headerRow.findIndex((h) => h.includes('ghi chú'));
    const linkIdx = headerRow.findIndex((h) => h.includes('link'));

    const parsedGuests = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      const name = (nameIdx >= 0 ? row[nameIdx] : (row[1] || row[0]))?.trim();
      if (!name || name.toLowerCase().includes('họ và tên') || name.toLowerCase().includes('stt')) continue;

      const sideRaw = (sideIdx >= 0 ? (row[sideIdx] || '') : (row[2] || '')).toLowerCase();
      const side = sideRaw.includes('trai') ? 'groom' : sideRaw.includes('gái') ? 'bride' : 'both';

      const eventRaw = (eventIdx >= 0 ? (row[eventIdx] || '') : (row[3] || '')).toLowerCase();
      let eventChoice = 'all';
      if (eventRaw.includes('vu quy') || eventRaw.includes('vuquy')) eventChoice = 'vuquy';
      else if (eventRaw.includes('nạp tài') || eventRaw.includes('naptai')) eventChoice = 'naptai';

      const attending = attendingIdx >= 0 ? (row[attendingIdx] || '').trim() : '';
      const rsvpCount = countIdx >= 0 ? (row[countIdx] || '').trim() : '';
      const wish = wishIdx >= 0 ? (row[wishIdx] || '').trim() : '';
      const note = (noteIdx >= 0 ? (row[noteIdx] || '') : (row[4] || '')).trim();

      let link = linkIdx >= 0 && row[linkIdx] ? row[linkIdx].trim() : '';
      if (!link || (!link.startsWith('http') && !link.includes('index.html'))) {
        link = `${baseUrl}?to=${encodeURIComponent(name)}&side=${side}&event=${eventChoice}`;
      } else if (link.startsWith('index.html')) {
        const queryString = link.includes('?') ? link.slice(link.indexOf('?')) : '';
        link = `${baseUrl}${queryString}`;
      }

      parsedGuests.push({
        id: i,
        name,
        side,
        eventChoice,
        note,
        link,
        attending,
        rsvpCount,
        wish,
        createdAt: 'File Excel'
      });
    }
    return parsedGuests;
  }

  /* ==========================================================================
     CLIENT-SIDE URL SHORTENER (Rút gọn trực tiếp trên Web, 100% Frontend)
     Native CORS Architecture (Spoo.me API + Multi-Provider Fallbacks)
     ========================================================================== */

  /**
   * Rút gọn URL bằng spoo.me API (Hỗ trợ NATIVE CORS 100%, không bị trình duyệt chặn)
   */
  function fetchSpooMe(targetUrl, alias = '') {
    const params = new URLSearchParams();
    params.append('url', targetUrl);
    if (alias) {
      // spoo.me alias tối đa 14 ký tự (chỉ giữ chữ, số, gạch ngang)
      const cleanAlias = alias.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 14);
      if (cleanAlias) params.append('alias', cleanAlias);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    return fetch('https://spoo.me/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params,
      signal: controller.signal
    })
      .then(res => {
        clearTimeout(timer);
        if (!res.ok) {
          return res.json().then(j => {
            throw new Error(j.AliasError || j.UrlError || ('HTTP ' + res.status));
          }).catch(() => {
            throw new Error('HTTP ' + res.status);
          });
        }
        return res.json();
      })
      .then(json => {
        if (json && json.short_url) {
          let shortUrl = String(json.short_url).trim();
          if (shortUrl.startsWith('http://')) {
            shortUrl = 'https://' + shortUrl.slice(7);
          }
          return shortUrl;
        }
        throw new Error('spoo.me không trả về short_url');
      })
      .catch(err => {
        clearTimeout(timer);
        throw err;
      });
  }

  /**
   * Dự phòng rút gọn TinyURL qua proxy AllOrigins (timeout 7s)
   */
  function fetchTinyUrlFallback(targetUrl, alias = '') {
    let tinyApi = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`;
    if (alias) tinyApi += `&alias=${encodeURIComponent(alias)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(tinyApi)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    return fetch(proxyUrl, { signal: controller.signal })
      .then(res => {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(json => {
        const text = (json && json.contents ? json.contents : '').trim();
        if (text && text.startsWith('http') && !text.toLowerCase().includes('error')) {
          return text;
        }
        throw new Error('TinyURL lỗi hoặc alias bị trùng');
      })
      .catch(err => {
        clearTimeout(timer);
        throw err;
      });
  }

  /**
   * Rút gọn URL 100% Client-Side với 4 tầng dự phòng
   */
  function shortenUrl(longUrl, guestName = '') {
    // Nếu longUrl chứa localhost hoặc 127.0.0.1 (khi test local), chuyển sang domain public của GitHub Pages
    // để các dịch vụ rút gọn API (spoo.me, tinyurl) chấp nhận và khách mở được trên điện thoại
    let targetUrl = longUrl;
    if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
      const publicBase = 'https://conchonha.github.io/sang-thuong-wedding-2026/index.html';
      const queryString = targetUrl.includes('?') ? targetUrl.slice(targetUrl.indexOf('?')) : '';
      targetUrl = `${publicBase}${queryString}`;
    }

    const firstName = guestName.trim().split(/\s+/).pop() || guestName.trim();
    const cleanName = firstName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

    // Luôn luôn bắt đầu bằng "sang-thuong-" (12 ký tự)
    // spoo.me giới hạn tối đa 16 ký tự -> lấy tối đa 4 ký tự tên: ví dụ sang-thuong-lan, sang-thuong-sang, sang-thuong-uhu...
    const namePart = (cleanName || 'khach').slice(0, 4);
    const alias = `sang-thuong-${namePart}`;

    // Tầng 1: Spoo.me với alias chuẩn sang-thuong-[tên] (Native CORS)
    return fetchSpooMe(targetUrl, alias)
      .catch(err1 => {
        console.warn('[Shortener] Alias trùng, thử thêm số vào cuối:', err1.message);
        // Tầng 2: Spoo.me với fallback alias (ví dụ: sang-thuong-la88)
        const fallbackAlias = `sang-thuong-${namePart.slice(0, 2)}${Math.floor(Math.random() * 89 + 10)}`;
        return fetchSpooMe(targetUrl, fallbackAlias);
      })
      .catch(err2 => {
        console.warn('[Shortener] Spoo.me fallback alias lỗi, thử ngẫu nhiên:', err2.message);
        // Tầng 3: Spoo.me ngẫu nhiên (không alias)
        return fetchSpooMe(targetUrl, '');
      })
      .catch(err3 => {
        console.warn('[Shortener] Spoo.me lỗi hoàn toàn, thử TinyURL dự phòng:', err3.message);
        // Tầng 4: TinyURL dự phòng qua proxy
        return fetchTinyUrlFallback(targetUrl, '');
      })
      .catch(err => {
        console.warn('[Shortener] Tất cả giải pháp rút gọn thất bại, dùng link gốc:', err.message);
        return Promise.reject(err);
      });
  }

  /**
   * Sau khi rút gọn link thành công: thay thế link dài bằng link ngắn
   * ở TẤT CẢ mọi chỗ trong result box (link input, preview HTML, plain text, nút chia sẻ).
   * @param {string} fullLink  - Link đầy đủ vừa tạo
   * @param {string} guestName - Tên khách (để tạo alias đẹp)
   * @param {object|null} targetGuest - Đối tượng khách mời (nếu có)
   */
  function applyShortLinkToResultBox(fullLink, guestName = '', targetGuest = null) {
    const linkInput    = document.getElementById('result-link-input');
    const msgTextarea  = document.getElementById('result-message-text');
    const previewHtml  = document.getElementById('invite-preview-html');
    const badge        = document.getElementById('link-shorten-badge');
    const btnPreview   = document.getElementById('btn-open-preview');

    if (!linkInput) return;

    // Helper: escape special chars trong regex
    function escRx(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Tìm khách tương ứng trong liveGuests nếu chưa truyền targetGuest
    const foundGuest = targetGuest || (guestName ? liveGuests.find(g => isExactNameMatching(g.name, guestName)) : null);

    // ⚡ KIỂM TRA: Nếu khách này ĐÃ CÓ link rút gọn lưu trên Google Sheet trước đó → DÙNG NGAY! Không gọi API lại!
    if (foundGuest && foundGuest.shortUrl && foundGuest.shortUrl.startsWith('http')) {
      const savedShortUrl = foundGuest.shortUrl;
      linkInput.value = savedShortUrl;
      linkInput.style.color = 'var(--gold-dark)';
      linkInput.style.fontWeight = '700';

      if (msgTextarea) {
        msgTextarea.value = msgTextarea.value.split(fullLink).join(savedShortUrl);
      }
      if (previewHtml) {
        previewHtml.innerHTML = previewHtml.innerHTML.replace(new RegExp(escRx(fullLink), 'g'), savedShortUrl);
      }
      if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = '✅ Link đã lưu trên Sheet';
        badge.style.background = '#e8f5e9';
        badge.style.borderColor = '#a5d6a7';
        badge.style.color = '#2e7d32';
        setTimeout(() => { badge.style.display = 'none'; }, 3500);
      }
      return;
    }

    // Hiện badge "⏳ Đang rút gọn..."
    if (badge) {
      badge.style.display = 'inline-block';
      badge.textContent = '⏳ Đang rút gọn...';
      badge.style.background = '#fff8ee';
      badge.style.borderColor = '#ebd9c5';
      badge.style.color = 'var(--gold-dark)';
    }

    shortenUrl(fullLink, guestName)
      .then(shortUrl => {
        // Cập nhật bộ nhớ liveGuests và lưu lên Google Sheet để dùng lại lần sau
        if (foundGuest) {
          foundGuest.shortUrl = shortUrl;
        }
        if (guestName) {
          saveShortLinkToGoogleSheet(guestName, shortUrl);
        }

        // 1. Cập nhật ô link → link ngắn
        linkInput.value = shortUrl;
        linkInput.style.color = 'var(--gold-dark)';
        linkInput.style.fontWeight = '700';

        // 2. Cập nhật textarea plain text (Zalo / Messenger / Copy Tin Nhắn dùng cái này)
        if (msgTextarea) {
          msgTextarea.value = msgTextarea.value.split(fullLink).join(shortUrl);
        }

        // 3. Cập nhật preview HTML (thay href và text của thẻ <a> chứa link dài)
        if (previewHtml) {
          previewHtml.innerHTML = previewHtml.innerHTML
            .replace(new RegExp(escRx(fullLink), 'g'), shortUrl);
        }

        // 4. Giữ nút "Xem Thử Thiệp" vẫn mở link đầy đủ (không redirect qua short)
        //    → không cần thay btnPreview.href

        // 5. Ẩn badge, thay bằng dấu ✅
        if (badge) {
          badge.textContent = '✅ Đã rút gọn & đã lưu Sheet';
          badge.style.background = '#e8f5e9';
          badge.style.borderColor = '#a5d6a7';
          badge.style.color = '#2e7d32';
          setTimeout(() => { badge.style.display = 'none'; }, 3000);
        }
      })
      .catch(err => {
        // Fallback: giữ nguyên link gốc, ẩn badge
        if (badge) {
          badge.textContent = '⚠️ Dùng link gốc';
          badge.style.background = '#ffebee';
          badge.style.borderColor = '#ffcdd2';
          badge.style.color = '#c62828';
          setTimeout(() => { badge.style.display = 'none'; }, 4000);
        }
        console.warn('[Admin] shortenUrl error:', err.message);
      });
  }


  /* ==========================================================================
     GOOGLE SHEETS INTEGRATION & LIVE SYNC
     ========================================================================== */
  function sendGuestToGoogleSheet(guest) {
    if (!GOOGLE_SHEET_URL) return;
    // Gửi raw values để Apps Script tự convert (groom/bride/both, vuquy/naptai/all)
    fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: guest.name,
        side: guest.side || 'both',
        eventChoice: guest.eventChoice || 'all',
        attending: guest.attending || 'Chưa phản hồi',
        count: guest.rsvpCount || '',
        wish: guest.wish || '',
        shortUrl: guest.shortUrl || '',
        time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      }),
      mode: 'no-cors'
    }).catch(err => console.warn('Lỗi gửi khách lên Google Sheet:', err));
  }

  function saveShortLinkToGoogleSheet(guestName, shortUrl) {
    if (!GOOGLE_SHEET_URL || !guestName || !shortUrl) return;
    fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_short_link',
        name: guestName,
        shortUrl: shortUrl
      }),
      mode: 'no-cors'
    }).catch(err => console.warn('Lỗi lưu link rút gọn lên Google Sheet:', err));
  }

  function deleteGuestOnGoogleSheet(guestName) {
    if (!GOOGLE_SHEET_URL || !guestName) return;
    fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_guest',
        name: guestName
      }),
      mode: 'no-cors'
    }).catch(err => console.warn('Lỗi xóa khách trên Google Sheet:', err));
  }

  function clearAllGuestsOnGoogleSheet() {
    if (!GOOGLE_SHEET_URL) return;
    fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear_all'
      }),
      mode: 'no-cors'
    }).catch(err => console.warn('Lỗi xóa tất cả khách trên Google Sheet:', err));
  }

  function loadGuestsFromGoogleSheet(showFeedback = false) {
    const tbody = document.getElementById('guest-table-body');
    if (tbody && (liveGuests.length === 0 || showFeedback)) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 40px 20px; color:#888;">
            <div style="font-size: 2rem; margin-bottom: 8px;">🔄</div>
            <div style="font-size: 1rem; font-weight: 600; color: #444;">Đang tải danh sách từ Google Sheets...</div>
            <p style="font-size: 0.82rem; color: #888; margin-top: 4px;">Kết nối trực tiếp với Google Sheet thời gian thực</p>
          </td>
        </tr>
      `;
    }

    const callbackName = 'gvizCallback_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');
    
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      cleanup();
      if (showFeedback) showToast('Không thể kết nối Google Sheets (quá thời gian chờ)!');
      renderGuestTable();
      renderRsvpList();
    }, 10000);

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(json) {
      if (timedOut) return;
      cleanup();

      try {
        if (!json || !json.table || !json.table.rows) {
          throw new Error('Dữ liệu Google Sheet không đúng định dạng');
        }

        // Xác định cột header: GViz có thể không nhận ra header (parsedNumHeaders=0, label='')
        // → tự đọc hàng đầu tiên làm header
        const colsHaveLabels = json.table.cols.some(c => c && c.label && c.label.trim());
        const baseUrl = getBaseUrl();
        const allRows = json.table.rows || [];

        let colNames = [];
        let dataRows = [];

        if (colsHaveLabels) {
          // GViz đã nhận ra header — dùng label từ cols
          colNames = json.table.cols.map((c, i) => (c && c.label ? c.label.trim() : `col_${i}`));
          dataRows = allRows;
        } else {
          // GViz KHÔNG nhận ra header — row đầu tiên là header, đọc từ cells
          if (allRows.length === 0) {
            liveGuests = [];
            renderGuestTable();
            renderRsvpList();
            if (showFeedback) showToast('Google Sheet chưa có dữ liệu khách mời nào!');
            return;
          }
          const headerCells = (allRows[0].c || []).map(cell => (cell && cell.v ? String(cell.v).trim() : ''));
          colNames = headerCells.length > 0 ? headerCells : json.table.cols.map((c, i) => `col_${i}`);
          dataRows = allRows.slice(1); // bỏ qua hàng header
        }

        // Các tên cột header phổ biến — safety net nếu vẫn lọt qua
        const HEADER_NAMES = new Set([
          'tên khách', 'họ và tên khách mời', 'tên', 'họ và tên',
          'ten khach', 'ho va ten khach moi', 'ten', 'ho va ten',
          'guest name', 'name'
        ]);

        const guests = dataRows.map((r, idx) => {
          const cells = (r.c || []).map(cell => (cell && cell.v !== null && cell.v !== undefined ? cell.v : ''));
          const rowObj = {};
          colNames.forEach((colName, cIdx) => {
            rowObj[colName] = cells[cIdx] !== undefined ? cells[cIdx] : '';
          });

          // Tên khách
          const name = String(rowObj['Tên Khách'] || rowObj['Họ và Tên Khách Mời'] || rowObj['Tên'] || cells[1] || '').trim();
          if (!name) return null;

          // Bỏ qua nếu name trùng với tên cột header (safety net)
          if (HEADER_NAMES.has(name.toLowerCase())) return null;

          // Phía khách
          const rawSide = String(rowObj['Phía Khách'] || rowObj['Phía'] || cells[2] || '').toLowerCase();
          let side = 'both';
          if (rawSide.includes('trai') || rawSide === 'groom') side = 'groom';
          else if (rawSide.includes('gái') || rawSide === 'bride') side = 'bride';

          // Tiệc mời
          const rawEvent = String(rowObj['Tiệc Mời'] || rowObj['Tiệc'] || cells[3] || '').toLowerCase();
          let eventChoice = 'all';
          if (rawEvent.includes('quy') || rawEvent === 'vuquy') eventChoice = 'vuquy';
          else if (rawEvent.includes('tài') || rawEvent === 'naptai') eventChoice = 'naptai';

          // Trạng thái RSVP & Link rút gọn
          const attending = String(rowObj['Trạng Thái'] || rowObj['Trạng Thái Đi'] || cells[4] || '').trim();
          const rsvpCount = String(rowObj['Số Người'] || cells[5] || '').trim();
          const wish = String(rowObj['Lời Chúc'] || cells[6] || '').trim();
          const createdAt = String(rowObj['Thời Gian Xác Nhận'] || rowObj['Ngày Tạo'] || cells[7] || '').trim();
          const shortUrl = String(rowObj['Link Rút Gọn'] || rowObj['Link Short'] || rowObj['Short Link'] || cells[8] || '').trim();

          const fullLink = `${baseUrl}?to=${encodeURIComponent(name)}&side=${side}&event=${eventChoice}`;

          return {
            id: rowObj['STT'] || (idx + 1),
            name,
            side,
            eventChoice,
            note: '',
            link: fullLink,
            shortUrl: shortUrl || '',
            attending: attending || '',
            rsvpCount: rsvpCount || '',
            wish: wish || '',
            createdAt: createdAt || 'Google Sheets'
          };
        }).filter(Boolean);

        // Lưu dữ liệu DUY NHẤT vào biến liveGuests trong bộ nhớ (không lưu localStorage)
        liveGuests = guests;
        renderGuestTable();
        renderRsvpList();

        if (showFeedback) {
          showToast(`Đã đồng bộ ${guests.length} khách từ Google Sheets thành công! 📊`);
        }
      } catch (err) {
        console.error('Lỗi phân tích Google Sheet:', err);
        if (showFeedback) showToast('Lỗi đọc dữ liệu từ Google Sheets!');
        renderGuestTable();
        renderRsvpList();
      }
    };

    script.onerror = function() {
      if (timedOut) return;
      cleanup();
      console.error('Không thể nạp dữ liệu từ Google Sheets endpoint');
      if (showFeedback) showToast('Không thể kết nối đến Google Sheets!');
      renderGuestTable();
      renderRsvpList();
    };

    script.src = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=RSVP`;
    document.head.appendChild(script);
  }

  function syncCsvToGoogleSheet() {
    if (!GOOGLE_SHEET_URL) {
      showToast('Chưa cấu hình GOOGLE_SHEET_URL!');
      return;
    }
    showToast('Đang đọc 5 khách mẫu từ file CSV và tải lên Google Sheets... ⏳');
    const baseUrl = getBaseUrl();
    fetch('data/danh_sach_khach_moi.csv?v=' + Date.now())
      .then(res => {
        if (!res.ok) throw new Error('Không thể tải file CSV');
        return res.text();
      })
      .then(csvText => {
        const rows = parseCsvRows(csvText);
        const guests = parseGuestRowsFromCsv(rows, baseUrl);
        if (guests.length === 0) {
          showToast('File CSV không có khách mời nào!');
          return;
        }

        let sent = 0;
        guests.forEach(g => {
          sendGuestToGoogleSheet(g);
          sent++;
        });

        showToast(`Đã gửi ${sent} khách lên Google Sheets! Đang làm mới bảng... ✨`);
        setTimeout(() => {
          loadGuestsFromGoogleSheet(true);
        }, 2200);
      })
      .catch(err => {
        console.warn('Lỗi đọc CSV:', err);
        showToast('Không đọc được file data/danh_sach_khach_moi.csv');
      });
  }

  function renderGuestTable(query = '') {
    const tbody = document.getElementById('guest-table-body');
    const badge = document.getElementById('guest-count-badge');
    if (!tbody) return;

    let guests = liveGuests;

    // Cập nhật số đếm tổng và bộ lọc phía
    if (badge) badge.innerText = guests.length;
    if (typeof updateSideFilterCounts === 'function') updateSideFilterCounts();

    let filtered = guests;
    // Lọc theo Phía Khách
    if (activeSide) {
      filtered = filtered.filter((g) => g.side === activeSide);
    }
    // Lọc theo từ khóa tìm kiếm
    if (query) {
      filtered = filtered.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      if (guests.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding: 40px 20px; color:#888;">
              <div style="font-size: 2.2rem; margin-bottom: 10px;">📊</div>
              <div style="font-size: 1.05rem; font-weight: 600; color: #444; margin-bottom: 6px;">
                Google Sheet Chưa Có Khách Mời Nào
              </div>
              <p style="font-size: 0.85rem; color: #888; max-width: 480px; margin: 0 auto 16px;">
                Dữ liệu hiện được lấy trực tiếp từ Google Sheets. Khi khách xác nhận tham dự hoặc bạn tạo link mời ở form phía trên, khách sẽ xuất hiện tại đây.
              </p>
              <button type="button" class="btn-small btn-small-gold" id="btn-empty-load-sheet" style="padding: 9px 18px;">
                🔄 Tải Lại Từ Google Sheets
              </button>
            </td>
          </tr>
        `;
        const btnEmptyLoad = document.getElementById('btn-empty-load-sheet');
        if (btnEmptyLoad) {
          btnEmptyLoad.onclick = () => loadGuestsFromGoogleSheet(true);
        }
      } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 25px; color:#888;">Không tìm thấy khách nào khớp với "${escapeHtml(query)}".</td></tr>`;
      }
      return;
    }

    filtered.forEach((g, idx) => {
      const tr = document.createElement('tr');
      tr.id = 'guest-row-' + g.id;
      const sideText = g.side === 'groom' ? 'Nhà Trai' : g.side === 'bride' ? 'Nhà Gái' : 'Bạn chung';
      const eventText = g.eventChoice === 'vuquy' 
        ? 'Lễ Vu Quy (Nhà Trai)' 
        : g.eventChoice === 'naptai' 
          ? 'Lễ Nạp Tài (Nhà Gái)' 
          : 'Cả Hai Buổi Lễ';

      let attendingHtml = '<span class="badge-attending-waiting">⏳ Chưa phản hồi</span>';
      if (g.attending === 'Có tham dự' || g.attending === 'Có' || g.attending === 'Sẽ tham dự') {
        const countText = g.rsvpCount ? ` (${escapeHtml(g.rsvpCount)})` : '';
        attendingHtml = `<span class="badge-attending-yes">✅ Có đi${countText}</span>`;
      } else if (g.attending === 'Không tham dự' || g.attending === 'Không' || g.attending === 'Không thể đến' || g.attending === 'Rất tiếc không đến') {
        attendingHtml = '<span class="badge-attending-no">❌ Không đi</span>';
      }

      let wishHtml = '<span style="color: #bbb; font-size: 0.8rem;">Chưa có</span>';
      if (g.wish) {
        wishHtml = `
          <div style="font-size: 0.82rem; color: #3a322c; line-height: 1.4; font-style: italic; background: #fffcf5; border-left: 2px solid var(--gold-primary); padding: 5px 8px; border-radius: 0 4px 4px 0; word-break: break-word; overflow-wrap: break-word;">
            "${escapeHtml(g.wish)}"
          </div>
        `;
      }

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td style="font-weight:600;">${escapeHtml(g.name)}</td>
        <td><span style="background:#f1ece5; padding: 3px 7px; border-radius: 12px; font-size: 0.78rem; white-space:nowrap;">${sideText}</span></td>
        <td><span style="background:#fff8ee; border:1px solid #ebd9c5; color:var(--gold-dark); padding: 3px 7px; border-radius: 12px; font-size: 0.78rem; font-weight:600; display:inline-block;">${eventText}</span></td>
        <td>${attendingHtml}</td>
        <td>${wishHtml}</td>
        <td>
          <div class="action-btn-group">
            <button class="btn-small btn-small-gold btn-copy-guest-link" data-link="${encodeURI(g.link)}" title="Sao chép link đầy đủ">
              📋 Copy
            </button>
            <button class="btn-small btn-small-outline btn-shorten-guest-link" data-link="${encodeURI(g.link)}" data-name="${escapeHtml(g.name)}" title="${g.shortUrl ? 'Link rút gọn đã lưu trên Sheet: ' + escapeHtml(g.shortUrl) : 'Rút gọn link rồi sao chép'}">
              ${g.shortUrl ? '✅ Short' : '🔗 Short'}
            </button>
            <a href="${g.link}" target="_blank" class="btn-small btn-small-outline" title="Mở thiệp">
              👁️
            </a>
            <button class="btn-small btn-small-danger btn-del-guest" data-id="${g.id}" title="Xóa khách này">
              🗑️
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach row events
    document.querySelectorAll('.btn-copy-guest-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const link = decodeURIComponent(btn.getAttribute('data-link'));
        copyText(link, 'Đã sao chép link thiệp!');
      });
    });

    // Nút rút gọn link ngay trong bảng
    document.querySelectorAll('.btn-shorten-guest-link').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const link = decodeURIComponent(btn.getAttribute('data-link'));
        const name = btn.getAttribute('data-name');
        const targetGuest = liveGuests.find(g => isExactNameMatching(g.name, name));

        // ⚡ KIỂM TRA: Nếu khách đã có link rút gọn trong Sheet/liveGuests → DÙNG NGAY!
        if (targetGuest && targetGuest.shortUrl && targetGuest.shortUrl.startsWith('http')) {
          await copyText(targetGuest.shortUrl, `Đã sao chép link rút gọn từ Sheet của ${name}! 🔗`);
          return;
        }

        const originalText = btn.textContent;
        btn.textContent = '⏳...';
        btn.disabled = true;
        try {
          // Truyền tên khách để alias được tạo đẹp: sang-thuong-wedding-[tên]
          const shortUrl = await shortenUrl(link, name);
          if (targetGuest) {
            targetGuest.shortUrl = shortUrl;
          }
          saveShortLinkToGoogleSheet(name, shortUrl);
          await copyText(shortUrl, `Đã rút gọn & lưu vào Sheet cho ${name}! 🔗`);
          renderGuestTable(document.getElementById('search-guest-input')?.value.trim() || '');
        } catch (err) {
          showToast('⚠️ Không thể rút gọn. Đã sao chép link gốc!');
          await copyText(link, 'Đã sao chép link gốc!');
        } finally {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    });

    document.querySelectorAll('.btn-del-guest').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetGuest = liveGuests.find(item => String(item.id) === String(id));
        liveGuests = liveGuests.filter((item) => String(item.id) !== String(id));
        renderGuestTable(document.getElementById('search-guest-input')?.value.trim() || '');
        renderRsvpList();
        if (targetGuest && targetGuest.name) {
          deleteGuestOnGoogleSheet(targetGuest.name);
        }
        showToast(`Đã xóa khách "${targetGuest ? targetGuest.name : ''}" trên Google Sheet! 🗑️`);
      });
    });
  }

  /* ==========================================================================
     EXCEL & REPO DATA INTEGRATION
     ========================================================================== */
  function initExcelAndRepoHandlers() {
    const btnLoadSheet = document.getElementById('btn-load-sheet') || document.getElementById('btn-load-excel');
    const btnSyncCsv = document.getElementById('btn-sync-csv-to-sheet');
    const btnClearAllGuests = document.getElementById('btn-clear-all-guests');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const importExcelInput = document.getElementById('import-excel-input');
    const btnExportJson = document.getElementById('btn-export-json');

    // 1. Tải danh sách khách trực tiếp từ Google Sheets
    if (btnLoadSheet && !btnLoadSheet.dataset.bound) {
      btnLoadSheet.dataset.bound = 'true';
      btnLoadSheet.addEventListener('click', () => {
        loadGuestsFromGoogleSheet(true);
      });
    }

    // 2. Đẩy 5 khách mẫu từ file CSV lên Google Sheet
    if (btnSyncCsv && !btnSyncCsv.dataset.bound) {
      btnSyncCsv.dataset.bound = 'true';
      btnSyncCsv.addEventListener('click', () => {
        syncCsvToGoogleSheet();
      });
    }

    // 2. Xóa tất cả khách (dùng custom modal thay vì window.confirm bị trình duyệt tự tắt)
    const modalClear = document.getElementById('modal-clear-guests');
    const btnCancelClear = document.getElementById('btn-cancel-clear-guests');
    const btnConfirmClear = document.getElementById('btn-confirm-clear-guests');

    if (btnClearAllGuests && !btnClearAllGuests.dataset.bound) {
      btnClearAllGuests.dataset.bound = 'true';
      btnClearAllGuests.addEventListener('click', (e) => {
        e.preventDefault();
        if (liveGuests.length === 0) {
          showToast('Danh sách khách mời hiện đang trống!');
          return;
        }
        if (modalClear) {
          modalClear.classList.add('active');
        } else {
          liveGuests = [];
          clearAllGuestsOnGoogleSheet();
          renderGuestTable();
          renderRsvpList();
          showToast('Đã xóa sạch toàn bộ khách trên Google Sheet! 🗑️');
        }
      });
    }

    if (btnCancelClear && !btnCancelClear.dataset.bound) {
      btnCancelClear.dataset.bound = 'true';
      btnCancelClear.addEventListener('click', () => {
        if (modalClear) modalClear.classList.remove('active');
      });
    }

    if (btnConfirmClear && !btnConfirmClear.dataset.bound) {
      btnConfirmClear.dataset.bound = 'true';
      btnConfirmClear.addEventListener('click', () => {
        if (modalClear) modalClear.classList.remove('active');
        liveGuests = [];
        clearAllGuestsOnGoogleSheet();
        renderGuestTable();
        renderRsvpList();
        showToast('Đã xóa sạch toàn bộ khách trên Google Sheet! 🗑️');
      });
    }

    if (modalClear && !modalClear.dataset.bound) {
      modalClear.dataset.bound = 'true';
      modalClear.addEventListener('click', (e) => {
        if (e.target === modalClear) {
          modalClear.classList.remove('active');
        }
      });
    }

    // 3. Xuất danh sách khách ra file Excel CSV (UTF-8 BOM hỗ trợ tiếng Việt)
    if (btnExportExcel && !btnExportExcel.dataset.bound) {
      btnExportExcel.dataset.bound = 'true';
      btnExportExcel.addEventListener('click', () => {
        const guests = liveGuests;
        if (guests.length === 0) {
          showToast('Chưa có khách mời nào để xuất file!');
          return;
        }

        let csv = '\uFEFF'; // UTF-8 Byte Order Mark for Excel
        csv += 'STT,Họ và Tên Khách Mời,Phía Khách,Tiệc Mời,Trạng Thái Tham Dự,Số Người,Lời Chúc,Ghi Chú,Link Thiệp Mời Riêng\n';

        guests.forEach((g, idx) => {
          const sideText = g.side === 'groom' ? 'Nhà Trai' : g.side === 'bride' ? 'Nhà Gái' : 'Bạn chung';
          const eventText = g.eventChoice === 'vuquy' 
            ? 'Lễ Vu Quy (Nhà Trai)' 
            : g.eventChoice === 'naptai' 
              ? 'Lễ Nạp Tài (Nhà Gái)' 
              : 'Cả Hai Buổi Lễ';
          const attendingText = g.attending || 'Chưa phản hồi';
          const countText = g.rsvpCount || '';
          const wishText = (g.wish || '').replace(/"/g, '""');
          const row = [
            idx + 1,
            `"${(g.name || '').replace(/"/g, '""')}"`,
            `"${sideText}"`,
            `"${eventText}"`,
            `"${attendingText}"`,
            `"${countText}"`,
            `"${wishText}"`,
            `"${(g.note || '').replace(/"/g, '""')}"`,
            `"${(g.link || '').replace(/"/g, '""')}"`,
          ].join(',');
          csv += row + '\n';
        });

        downloadFile(csv, 'danh_sach_khach_moi.csv', 'text/csv;charset=utf-8;');
        showToast('Đã xuất file Excel danh sách khách mời thành công! 📥');
      });
    }

    // 4. Nhập danh sách khách từ file Excel .csv trên máy
    if (importExcelInput && !importExcelInput.dataset.bound) {
      importExcelInput.dataset.bound = 'true';
      importExcelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          const rows = parseCsvRows(content);
          if (rows.length <= 1) {
            showToast('File Excel không có dữ liệu khách mời!');
            return;
          }

          const baseUrl = getBaseUrl();
          const parsed = parseGuestRowsFromCsv(rows, baseUrl);
          if (parsed.length === 0) {
            showToast('Không tìm thấy dữ liệu khách mời hợp lệ trong file!');
            return;
          }

          const currentGuests = liveGuests;
          let addedCount = 0;
          let updatedCount = 0;

          parsed.forEach((pg) => {
            const normPgName = pg.name.toLowerCase().replace(/\s+/g, ' ');
            const existingIdx = currentGuests.findIndex(cg => (cg.name || '').toLowerCase().replace(/\s+/g, ' ') === normPgName);
            if (existingIdx !== -1) {
              currentGuests[existingIdx].side = pg.side || currentGuests[existingIdx].side;
              currentGuests[existingIdx].eventChoice = pg.eventChoice || currentGuests[existingIdx].eventChoice;
              if (pg.attending) currentGuests[existingIdx].attending = pg.attending;
              if (pg.rsvpCount) currentGuests[existingIdx].rsvpCount = pg.rsvpCount;
              if (pg.wish) currentGuests[existingIdx].wish = pg.wish;
              if (pg.note) currentGuests[existingIdx].note = pg.note;
              sendGuestToGoogleSheet(currentGuests[existingIdx]);
              updatedCount++;
            } else {
              pg.id = Date.now() + Math.floor(Math.random() * 1000);
              pg.createdAt = 'Nhập từ Excel';
              currentGuests.push(pg);
              sendGuestToGoogleSheet(pg);
              addedCount++;
            }
          });

          renderGuestTable();
          renderRsvpList();
          showToast(`Đã nhập Excel & đẩy lên Google Sheet: Thêm mới ${addedCount}, cập nhật ${updatedCount} khách mời! 🎉`);
          importExcelInput.value = '';
        };
        reader.readAsText(file, 'UTF-8');
      });
    }

    // 5. Tải file data/guests.json
    if (btnExportJson && !btnExportJson.dataset.bound) {
      btnExportJson.dataset.bound = 'true';
      btnExportJson.addEventListener('click', () => {
        const guests = liveGuests;
        const jsonStr = JSON.stringify(guests, null, 2);
        downloadFile(jsonStr, 'guests.json', 'application/json');
        showToast('Đã tải file guests.json! Bạn có thể lưu vào thư mục data/ để đẩy lên GitHub.');
      });
    }
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ==========================================================================
     4. CONFIG MANAGER (LOCATIONS & GOOGLE MAPS)
     ========================================================================== */
  function initConfigManager() {
    const configForm = document.getElementById('config-form');
    if (!configForm) return;

    // Load saved config
    const savedConfig = JSON.parse(localStorage.getItem('wedding_custom_config') || '{}');

    if (savedConfig.groomName) document.getElementById('cfg-groom-name').value = savedConfig.groomName;
    if (savedConfig.brideName) document.getElementById('cfg-bride-name').value = savedConfig.brideName;
    if (savedConfig.weddingDate) document.getElementById('cfg-wedding-date').value = savedConfig.weddingDate;
    if (savedConfig.weddingDateText) document.getElementById('cfg-wedding-date-text').value = savedConfig.weddingDateText;

    // Lễ Nạp Tài (Nhà Gái)
    if (savedConfig.naptaiTime) document.getElementById('cfg-naptai-time').value = savedConfig.naptaiTime;
    if (savedConfig.naptaiAddress) document.getElementById('cfg-naptai-address').value = savedConfig.naptaiAddress;
    if (savedConfig.naptaiMap) document.getElementById('cfg-naptai-map').value = savedConfig.naptaiMap;

    // Lễ Vu Quy (Nhà Trai)
    if (savedConfig.vuquyTime) document.getElementById('cfg-vuquy-time').value = savedConfig.vuquyTime;
    if (savedConfig.vuquyAddress) document.getElementById('cfg-vuquy-address').value = savedConfig.vuquyAddress;
    if (savedConfig.vuquyMap) document.getElementById('cfg-vuquy-map').value = savedConfig.vuquyMap;

    // Banks
    if (savedConfig.bankGroomAcc) document.getElementById('cfg-bank-groom-acc').value = savedConfig.bankGroomAcc;
    if (savedConfig.bankGroomName) document.getElementById('cfg-bank-groom-name').value = savedConfig.bankGroomName;
    if (savedConfig.bankBrideAcc) document.getElementById('cfg-bank-bride-acc').value = savedConfig.bankBrideAcc;
    if (savedConfig.bankBrideName) document.getElementById('cfg-bank-bride-name').value = savedConfig.bankBrideName;

    // Story Milestones (6 Mốc Hành Trình Chung Đôi)
    if (savedConfig.story) {
      for (let i = 1; i <= 6; i++) {
        const dateInput = document.getElementById(`cfg-story-date-${i}`);
        const descInput = document.getElementById(`cfg-story-desc-${i}`);
        if (dateInput && savedConfig.story[`date${i}`]) dateInput.value = savedConfig.story[`date${i}`];
        if (descInput && savedConfig.story[`desc${i}`]) descInput.value = savedConfig.story[`desc${i}`];
      }
    }

    configForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const newConfig = {
        groomName: document.getElementById('cfg-groom-name').value.trim(),
        brideName: document.getElementById('cfg-bride-name').value.trim(),
        weddingDate: document.getElementById('cfg-wedding-date').value,
        weddingDateText: document.getElementById('cfg-wedding-date-text').value.trim(),

        naptaiTime: document.getElementById('cfg-naptai-time').value.trim(),
        naptaiAddress: document.getElementById('cfg-naptai-address').value.trim(),
        naptaiMap: document.getElementById('cfg-naptai-map').value.trim(),

        vuquyTime: document.getElementById('cfg-vuquy-time').value.trim(),
        vuquyAddress: document.getElementById('cfg-vuquy-address').value.trim(),
        vuquyMap: document.getElementById('cfg-vuquy-map').value.trim(),

        bankGroomAcc: document.getElementById('cfg-bank-groom-acc').value.trim(),
        bankGroomName: document.getElementById('cfg-bank-groom-name').value.trim(),
        bankBrideAcc: document.getElementById('cfg-bank-bride-acc').value.trim(),
        bankBrideName: document.getElementById('cfg-bank-bride-name').value.trim(),

        story: {
          date1: document.getElementById('cfg-story-date-1')?.value.trim() || '',
          desc1: document.getElementById('cfg-story-desc-1')?.value.trim() || '',
          date2: document.getElementById('cfg-story-date-2')?.value.trim() || '',
          desc2: document.getElementById('cfg-story-desc-2')?.value.trim() || '',
          date3: document.getElementById('cfg-story-date-3')?.value.trim() || '',
          desc3: document.getElementById('cfg-story-desc-3')?.value.trim() || '',
          date4: document.getElementById('cfg-story-date-4')?.value.trim() || '',
          desc4: document.getElementById('cfg-story-desc-4')?.value.trim() || '',
          date5: document.getElementById('cfg-story-date-5')?.value.trim() || '',
          desc5: document.getElementById('cfg-story-desc-5')?.value.trim() || '',
          date6: document.getElementById('cfg-story-date-6')?.value.trim() || '',
          desc6: document.getElementById('cfg-story-desc-6')?.value.trim() || '',
        },
      };

      localStorage.setItem('wedding_custom_config', JSON.stringify(newConfig));
      showToast('Đã lưu cấu hình và cập nhật lên trang thiệp cưới! ✨');
    });
  }

  /* ==========================================================================
     5. RSVP LIST
     ========================================================================== */
  function renderRsvpList() {
    // ── Trạng thái bộ lọc RSVP tab (tách biệt với tab Danh sách) ──
    if (typeof renderRsvpList._rsvpSide === 'undefined') {
      renderRsvpList._rsvpSide   = '';
      renderRsvpList._rsvpStatus = '';
    }

    // ── Cập nhật stat cards ──
    const allGuests = liveGuests;

    const isAttYes  = (g) => ['Có tham dự','Có','Sẽ tham dự'].includes(g.attending);
    const isAttNo   = (g) => ['Không tham dự','Không','Không thể đến','Rất tiếc không đến'].includes(g.attending);
    const isAttWait = (g) => !isAttYes(g) && !isAttNo(g);

    const cntYes  = allGuests.filter(isAttYes).length;
    const cntNo   = allGuests.filter(isAttNo).length;
    const cntWait = allGuests.filter(isAttWait).length;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('rsvp-stat-total', allGuests.length);
    setEl('rsvp-stat-yes',   cntYes);
    setEl('rsvp-stat-no',    cntNo);
    setEl('rsvp-stat-wait',  cntWait);

    // ── Cập nhật count pills phía ──
    const sideCounts = { '': allGuests.length, groom: 0, bride: 0, both: 0 };
    allGuests.forEach(g => {
      if (g.side === 'groom') sideCounts.groom++;
      else if (g.side === 'bride') sideCounts.bride++;
      else sideCounts.both++;
    });
    setEl('rsvp-cnt-all',   sideCounts['']);
    setEl('rsvp-cnt-groom', sideCounts.groom);
    setEl('rsvp-cnt-bride', sideCounts.bride);
    setEl('rsvp-cnt-both',  sideCounts.both);

    // ── Wire bộ lọc phía (chỉ bind 1 lần) ──
    document.querySelectorAll('[data-rsvp-side]').forEach(btn => {
      if (!btn.dataset.rsvpBound) {
        btn.dataset.rsvpBound = 'true';
        btn.addEventListener('click', () => {
          renderRsvpList._rsvpSide = btn.getAttribute('data-rsvp-side');
          document.querySelectorAll('[data-rsvp-side]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderRsvpFullTable();
        });
      }
    });

    // ── Wire bộ lọc trạng thái (chỉ bind 1 lần) ──
    document.querySelectorAll('[data-rsvp-status]').forEach(btn => {
      if (!btn.dataset.rsvpStatusBound) {
        btn.dataset.rsvpStatusBound = 'true';
        btn.addEventListener('click', () => {
          renderRsvpList._rsvpStatus = btn.getAttribute('data-rsvp-status');
          document.querySelectorAll('[data-rsvp-status]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderRsvpFullTable();
        });
      }
    });

    // ── Wire ô tìm kiếm (chỉ bind 1 lần) ──
    const rsvpSearch = document.getElementById('rsvp-search-input');
    if (rsvpSearch && !rsvpSearch.dataset.rsvpBound) {
      rsvpSearch.dataset.rsvpBound = 'true';
      rsvpSearch.addEventListener('input', () => renderRsvpFullTable());
    }

    // ── Render bảng toàn bộ khách từ Google Sheets ──
    renderRsvpFullTable();

    // ── Xuất CSV ──
    const btnExportRsvp = document.getElementById('btn-export-rsvp-excel');
    if (btnExportRsvp && !btnExportRsvp.dataset.bound) {
      btnExportRsvp.dataset.bound = 'true';
      btnExportRsvp.addEventListener('click', () => {
        const guests = liveGuests;
        if (guests.length === 0) { showToast('Chưa có dữ liệu khách để xuất!'); return; }

        let csv = '\uFEFF';
        csv += 'STT,Tên Khách Mời,Phía Khách,Tiệc Mời,Trạng Thái,Số Người,Lời Chúc\n';
        guests.forEach((g, idx) => {
          const sideText  = g.side === 'groom' ? 'Nhà Trai' : g.side === 'bride' ? 'Nhà Gái' : 'Bạn Chung';
          const eventText = g.eventChoice === 'vuquy' ? 'Lễ Vu Quy' : g.eventChoice === 'naptai' ? 'Lễ Nạp Tài' : 'Cả Hai Lễ';
          const row = [
            idx + 1,
            `"${(g.name||'').replace(/"/g,'""')}"`,
            `"${sideText}"`,
            `"${eventText}"`,
            `"${(g.attending||'Chưa phản hồi').replace(/"/g,'""')}"`,
            `"${(g.rsvpCount||'').replace(/"/g,'""')}"`,
            `"${(g.wish||'').replace(/"/g,'""')}"`
          ].join(',');
          csv += row + '\n';
        });
        downloadFile(csv, 'danh_sach_rsvp_toan_bo.csv', 'text/csv;charset=utf-8;');
        showToast('Đã xuất file Excel danh sách RSVP thành công! 📥');
      });
    }

  }

  // Bảng toàn bộ khách từ Google Sheets với bộ lọc Phía + Trạng Thái + Tìm kiếm
  function renderRsvpFullTable() {
    const tbody = document.getElementById('rsvp-full-table-body');
    if (!tbody) return;

    const isAttYes  = (g) => ['Có tham dự','Có','Sẽ tham dự'].includes(g.attending);
    const isAttNo   = (g) => ['Không tham dự','Không','Không thể đến','Rất tiếc không đến'].includes(g.attending);

    let guests = liveGuests;

    // Lọc phía
    const side = renderRsvpList._rsvpSide || '';
    if (side) guests = guests.filter(g => g.side === side);

    // Lọc trạng thái
    const status = renderRsvpList._rsvpStatus || '';
    if (status === 'yes')  guests = guests.filter(isAttYes);
    else if (status === 'no')   guests = guests.filter(isAttNo);
    else if (status === 'wait') guests = guests.filter(g => !isAttYes(g) && !isAttNo(g));

    // Tìm kiếm tên
    const q = (document.getElementById('rsvp-search-input')?.value || '').trim().toLowerCase();
    if (q) guests = guests.filter(g => g.name.toLowerCase().includes(q));

    tbody.innerHTML = '';

    if (guests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#aaa;">
        <div style="font-size:1.8rem; margin-bottom:8px;">🔍</div>
        Không tìm thấy khách phù hợp với bộ lọc đang chọn.
      </td></tr>`;
      return;
    }

    guests.forEach((g, idx) => {
      const tr = document.createElement('tr');
      const sideText  = g.side === 'groom' ? 'Nhà Trai' : g.side === 'bride' ? 'Nhà Gái' : 'Bạn Chung';
      const sideColor = g.side === 'groom' ? '#e8f0ff' : g.side === 'bride' ? '#fce4ec' : '#f1ece5';
      const sideTxt   = g.side === 'groom' ? '#1565c0' : g.side === 'bride' ? '#880e4f' : '#4a3e35';
      const eventText = g.eventChoice === 'vuquy'
        ? 'Lễ Vu Quy (Nhà Trai)'
        : g.eventChoice === 'naptai'
          ? 'Lễ Nạp Tài (Nhà Gái)'
          : 'Cả Hai Buổi Lễ';

      let attendingHtml = '<span class="badge-attending-waiting">⏳ Chưa phản hồi</span>';
      if (isAttYes(g)) {
        attendingHtml = `<span class="badge-attending-yes">✅ Sẽ đi</span>`;
      } else if (isAttNo(g)) {
        attendingHtml = '<span class="badge-attending-no">❌ Không đi</span>';
      }

      // Chỉ lấy phần số từ rsvpCount (vd: "2 người" → "2")
      const slNum = g.rsvpCount ? (g.rsvpCount.match(/\d+/) || [g.rsvpCount])[0] : '';

      let wishHtml = '<span style="color:#ccc; font-size:0.78rem;">—</span>';
      if (g.wish) {
        wishHtml = `<div style="font-size:0.81rem; color:#3a322c; line-height:1.5; font-style:italic; background:#fffcf5; border-left:2px solid var(--gold-primary); padding:5px 8px; border-radius:0 4px 4px 0; white-space:normal; word-break:break-word; overflow-wrap:break-word;">"${escapeHtml(g.wish)}"</div>`;
      }

      tr.innerHTML = `
        <td style="text-align:center; font-size:0.8rem; color:#aaa;">${idx + 1}</td>
        <td style="font-weight:600;">${escapeHtml(g.name)}</td>
        <td><span style="background:${sideColor}; color:${sideTxt}; padding:3px 8px; border-radius:12px; font-size:0.78rem; font-weight:600; white-space:nowrap;">${sideText}</span></td>
        <td><span style="background:#fff8ee; border:1px solid #ebd9c5; color:var(--gold-dark); padding:3px 7px; border-radius:12px; font-size:0.76rem; font-weight:600; display:inline-block; white-space:normal; line-height:1.4;">${eventText}</span></td>
        <td>${attendingHtml}</td>
        <td style="text-align:center; font-weight:700; color:#4a3e35; white-space:nowrap;">${slNum || '<span style="color:#ccc">—</span>'}</td>
        <td style="white-space:normal;">${wishHtml}</td>
        <td>
          <div class="action-btn-group" style="justify-content:center;">
            <button class="btn-small btn-small-gold btn-rsvp-copy-link" data-link="${encodeURI(g.link)}" title="Sao chép link thiệp mời">
              📋
            </button>
            <a href="${g.link}" target="_blank" class="btn-small btn-small-outline" title="Mở thiệp mời" style="padding: 5px 8px;">
              👁️
            </a>
            <button class="btn-small btn-small-danger btn-rsvp-del-guest" data-id="${g.id}" title="Xóa khách này">
              🗑️
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Gắn sự kiện cho nút copy link RSVP
    tbody.querySelectorAll('.btn-rsvp-copy-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const link = decodeURI(btn.getAttribute('data-link'));
        copyText(link, 'Đã sao chép link thiệp! 🔗');
      });
    });

    // Gắn sự kiện cho nút xóa khách RSVP
    tbody.querySelectorAll('.btn-rsvp-del-guest').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetGuest = liveGuests.find(item => String(item.id) === String(id));
        liveGuests = liveGuests.filter(item => String(item.id) !== String(id));
        renderGuestTable(document.getElementById('search-guest-input')?.value.trim() || '');
        renderRsvpList();
        if (targetGuest && targetGuest.name) {
          deleteGuestOnGoogleSheet(targetGuest.name);
          showToast(`Đã xóa khách "${targetGuest.name}" trên Google Sheet! 🗑️`);
        }
      });
    });
  }

  // (Bảng RSVP form cũ đã được gộp vào bảng chính phía trên)

  /* ==========================================================================
     UTILITIES
     ========================================================================== */
  function copyText(text, successMsg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      showToast(successMsg);
    });
  }

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

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  }
});
