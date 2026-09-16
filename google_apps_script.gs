/**
 * LUXURY WEDDING - GOOGLE APPS SCRIPT
 * Sheet ID: 1JlN1-utEeoLThwzfsyvnNNIDQovqeocbMTEq_NSeWo4
 *
 * Hướng dẫn cài đặt vào Google Sheet:
 * 1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/1JlN1-utEeoLThwzfsyvnNNIDQovqeocbMTEq_NSeWo4/edit
 * 2. Menu Tiện ích mở rộng (Extensions) → Apps Script
 * 3. Xoá hết code cũ, dán toàn bộ code này vào → Nhấn Save (Ctrl+S hoặc Cmd+S)
 * 4. Nhấn Triển khai (Deploy) → Quản lý bản triển khai (Manage deployments) → Chỉnh sửa (Edit)
 *    → Chọn "Phiên bản mới" (New version) → Nhấn Triển khai (Deploy)
 */

const SHEET_NAME = 'RSVP'; // Tên tab sheet lưu trữ khách mời và RSVP

// ═══════════════════════════════════════════════════════════════════
// HÀM CHẠY THỬ / DỌN DẸP TRÙNG LẶP TRỰC TIẾP
// ═══════════════════════════════════════════════════════════════════
function testAuth() {
  const res = callTinyUrl('https://google.com', 'test-auth');
  Logger.log(res);
}

// Chạy hàm này trực tiếp trong Apps Script nếu muốn dọn dẹp các dòng trùng trên Sheet ngay lập tức
function cleanDuplicates() {
  const sheet = getOrCreateSheet(SHEET_NAME);
  removeDuplicates(sheet);
  Logger.log('Đã dọn dẹp xong toàn bộ dòng trùng lặp trên Sheet!');
}

// ═══════════════════════════════════════════════════════════════════
// GET — Trả về danh sách khách mời hoặc xử lý qua GET
// ═══════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAME);
    const params = (e && e.parameter) ? e.parameter : {};

    // 0. Rút gọn link TinyURL qua Apps Script backend
    if (params.action === 'shorten') {
      const longUrl = params.url || '';
      const alias = params.alias || '';
      if (!longUrl) return jsonResponse({ success: false, error: 'Thiếu tham số url' });
      return jsonResponse(callTinyUrl(longUrl, alias));
    }

    // 1. Tự động dọn dẹp các dòng trùng lặp
    if (params.action === 'clean_duplicates') {
      const lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        removeDuplicates(sheet);
        return jsonResponse({ success: true, message: 'Đã dọn dẹp các dòng trùng lặp thành công' });
      } finally {
        lock.releaseLock();
      }
    }

    // 2. Lưu link rút gọn qua GET
    if (params.action === 'save_short_link') {
      return handleSaveShortLink(sheet, params);
    }

    // 3. Xoá 1 khách qua GET
    if (params.action === 'delete_guest') {
      return handleDeleteGuest(sheet, params);
    }

    // 4. Mặc định: Trả về danh sách khách mời trong Google Sheet
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return jsonResponse({ success: true, count: 0, data: [] });
    }

    const headers = rows[0].map(h => String(h).trim());
    const data = rows.slice(1).map((row, idx) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? String(row[i]) : '';
      });
      return obj;
    });

    return jsonResponse({ success: true, count: data.length, data: data });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
// POST — Nhận dữ liệu RSVP hoặc khách mới từ website
// ═══════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAME);
    let data = {};
    
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 1. Xoá tất cả khách trên Google Sheet
    if (data.action === 'clear_all') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      return jsonResponse({ success: true, message: 'Đã xóa toàn bộ khách trên Google Sheet' });
    }

    // 2. Xoá 1 khách theo tên
    if (data.action === 'delete_guest') {
      return handleDeleteGuest(sheet, data);
    }

    // 3. Lưu link rút gọn của 1 khách
    if (data.action === 'save_short_link') {
      return handleSaveShortLink(sheet, data);
    }

    // 4. Thêm hoặc cập nhật khách
    return handleSaveGuest(sheet, data);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ─── XỬ LÝ LƯU LINK RÚT GỌN ───────────────────────────────────────
function handleSaveShortLink(sheet, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonResponse({ success: false, message: 'Hệ thống đang bận' });
  }

  try {
    const targetName = normalizeName(data.name || '');
    const shortUrl = String(data.shortUrl || data.shortLink || '').trim();
    if (!targetName || !shortUrl) {
      return jsonResponse({ success: false, message: 'Thiếu thông tin tên hoặc shortUrl' });
    }
    const rows = sheet.getDataRange().getValues();
    if (rows.length > 0 && (!rows[0][8] || String(rows[0][8]).trim() === '')) {
      sheet.getRange(1, 9).setValue('Link Rút Gọn');
    }
    for (let i = 1; i < rows.length; i++) {
      if (normalizeName(String(rows[i][1])) === targetName) {
        sheet.getRange(i + 1, 9).setValue(shortUrl);
        removeDuplicates(sheet);
        return jsonResponse({ success: true, message: 'Đã cập nhật link rút gọn vào Google Sheet' });
      }
    }
    // Không tìm thấy thì KHÔNG được insert mới
    return jsonResponse({ success: false, message: 'Không tìm thấy khách để cập nhật link rút gọn' });
  } finally {
    lock.releaseLock();
  }
}

// ─── XỬ LÝ XOÁ KHÁCH ──────────────────────────────────────────────
function handleDeleteGuest(sheet, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {}

  try {
    const targetName = normalizeName(data.name || '');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (normalizeName(String(rows[i][1])) === targetName) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    removeDuplicates(sheet);
    return jsonResponse({ success: true, message: 'Đã xóa khách trên Google Sheet' });
  } finally {
    lock.releaseLock();
  }
}

// ─── XỬ LÝ THÊM / CẬP NHẬT KHÁCH ──────────────────────────────────
function handleSaveGuest(sheet, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonResponse({ success: false, message: 'Hệ thống đang bận' });
  }

  try {
    const name = String(data.name || '').trim();
    if (!name) {
      return jsonResponse({ success: false, message: 'Thiếu tên khách mời' });
    }

    let sideText = data.side || 'Bạn chung';
    if (data.side === 'groom') sideText = 'Nhà Trai';
    else if (data.side === 'bride') sideText = 'Nhà Gái';
    else if (data.side === 'both') sideText = 'Bạn chung';

    let eventText = data.eventChoice || 'Cả Hai Buổi Lễ';
    if (data.eventChoice === 'vuquy') eventText = 'Lễ Vu Quy (Nhà Trai)';
    else if (data.eventChoice === 'naptai') eventText = 'Lễ Nạp Tài (Nhà Gái)';
    else if (data.eventChoice === 'all') eventText = 'Cả Hai Buổi Lễ';

    const attending = data.attending || 'Chưa phản hồi';
    const count = data.count || '';
    const wish = data.wish || '';
    const shortUrl = String(data.shortUrl || data.shortLink || '').trim();
    const nowTime = data.time || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const rows = sheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < rows.length; i++) {
      const existingName = String(rows[i][1] || '').trim();
      if (normalizeName(existingName) === normalizeName(name)) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow > 0) {
      // Cập nhật dòng khách đã tồn tại (TUYỆT ĐỐI KHÔNG TẠO DÒNG MỚI)
      if (data.action === 'wish') {
        if (data.side && sideText && !rows[foundRow - 1][2]) sheet.getRange(foundRow, 3).setValue(sideText);
        if (wish) sheet.getRange(foundRow, 7).setValue(wish);
        sheet.getRange(foundRow, 8).setValue(nowTime);
      } else {
        if (sideText) sheet.getRange(foundRow, 3).setValue(sideText);
        if (eventText) sheet.getRange(foundRow, 4).setValue(eventText);
        if (data.attending) sheet.getRange(foundRow, 5).setValue(attending);
        if (count) sheet.getRange(foundRow, 6).setValue(count);
        if (wish) sheet.getRange(foundRow, 7).setValue(wish);
        sheet.getRange(foundRow, 8).setValue(nowTime);
        if (shortUrl) sheet.getRange(foundRow, 9).setValue(shortUrl);
      }
    } else {
      // Chỉ thêm dòng mới khi tên chưa từng tồn tại trên Sheet
      const nextStt = rows.length <= 1 ? 1 : rows.length;
      sheet.appendRow([
        nextStt,
        name,
        sideText,
        data.action === 'wish' ? 'Cả Hai Buổi Lễ' : eventText,
        data.action === 'wish' ? 'Chưa phản hồi' : attending,
        data.action === 'wish' ? '' : count,
        wish,
        nowTime,
        shortUrl
      ]);
    }

    // Tự động dọn dẹp trùng lặp và đồng bộ lại STT
    removeDuplicates(sheet);

    return jsonResponse({ success: true, message: 'Đã ghi nhận thành công' });
  } finally {
    lock.releaseLock();
  }
}

// ═══════════════════════════════════════════════════════════════════
// HÀM TỰ ĐỘNG DỌN DẸP TRÙNG LẶP & ĐỒNG BỘ STT
// ═══════════════════════════════════════════════════════════════════
function removeDuplicates(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 2) return;

  const seen = {};
  const rowsToDelete = [];

  for (let i = 1; i < rows.length; i++) {
    const rawName = String(rows[i][1] || '').trim();
    const key = normalizeName(rawName);
    if (!key) continue;

    if (seen[key] !== undefined) {
      const prevRowIdx = seen[key]; // 1-indexed row number
      const prevShort = String(rows[prevRowIdx - 1][8] || '').trim();
      const currShort = String(rows[i][8] || '').trim();

      // Nếu dòng trước chưa có link rút gọn mà dòng sau có -> cập nhật vào dòng trước
      if (!prevShort && currShort) {
        sheet.getRange(prevRowIdx, 9).setValue(currShort);
        rows[prevRowIdx - 1][8] = currShort;
      }

      const prevWish = String(rows[prevRowIdx - 1][6] || '').trim();
      const currWish = String(rows[i][6] || '').trim();
      if (!prevWish && currWish) {
        sheet.getRange(prevRowIdx, 7).setValue(currWish);
        rows[prevRowIdx - 1][6] = currWish;
      }

      const prevAttend = String(rows[prevRowIdx - 1][4] || '').trim();
      const currAttend = String(rows[i][4] || '').trim();
      if ((!prevAttend || prevAttend === 'Chưa phản hồi') && currAttend && currAttend !== 'Chưa phản hồi') {
        sheet.getRange(prevRowIdx, 5).setValue(currAttend);
        rows[prevRowIdx - 1][4] = currAttend;
      }

      rowsToDelete.push(i + 1);
    } else {
      seen[key] = i + 1;
    }
  }

  // Xóa các dòng trùng từ dưới lên để không làm sai lệch chỉ số dòng
  for (let d = rowsToDelete.length - 1; d >= 0; d--) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  // Đánh lại số thứ tự STT
  const finalRows = sheet.getLastRow();
  if (finalRows > 1) {
    for (let r = 2; r <= finalRows; r++) {
      sheet.getRange(r, 1).setValue(r - 1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// TIỆN ÍCH HỖ TRỢ
// ═══════════════════════════════════════════════════════════════════
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Tạo header ban đầu
    const headers = [
      'STT', 'Tên Khách', 'Phía Khách', 'Tiệc Mời',
      'Trạng Thái', 'Số Người', 'Lời Chúc', 'Thời Gian Xác Nhận', 'Link Rút Gọn'
    ];
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#b7791f');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function normalizeName(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function callTinyUrl(url, alias) {
  try {
    let apiUrl = 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url);
    if (alias) apiUrl += '&alias=' + encodeURIComponent(alias);
    const response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    const text = response.getContentText().trim();
    if (text && text.startsWith('http') && !text.toLowerCase().includes('error')) {
      return { success: true, shorturl: text };
    }
    // Nếu alias bị trùng, thử fallback alias kèm 2 số ngẫu nhiên
    if (alias) {
      const fallbackAlias = alias + '-' + Math.floor(Math.random() * 89 + 10);
      const fbApi = 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url) + '&alias=' + encodeURIComponent(fallbackAlias);
      const fbResp = UrlFetchApp.fetch(fbApi, { muteHttpExceptions: true });
      const fbText = fbResp.getContentText().trim();
      if (fbText && fbText.startsWith('http') && !fbText.toLowerCase().includes('error')) {
        return { success: true, shorturl: fbText };
      }
    }
    // Fallback không alias
    const rndApi = 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url);
    const rndResp = UrlFetchApp.fetch(rndApi, { muteHttpExceptions: true });
    const rndText = rndResp.getContentText().trim();
    if (rndText && rndText.startsWith('http')) {
      return { success: true, shorturl: rndText };
    }
    return { success: false, error: text || 'Không thể tạo TinyURL' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
