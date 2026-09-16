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
// GET — Trả về trạng thái hoạt động
// ═══════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAME);
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
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 1. Xoá tất cả khách trên Google Sheet (giữ lại dòng header)
    if (data.action === 'clear_all') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      return jsonResponse({ success: true, message: 'Đã xóa toàn bộ khách trên Google Sheet' });
    }

    // 2. Xoá 1 khách theo tên
    if (data.action === 'delete_guest') {
      const targetName = normalizeName(data.name || '');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (normalizeName(String(rows[i][1])) === targetName) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return jsonResponse({ success: true, message: 'Đã xóa khách trên Google Sheet' });
    }

    const name = String(data.name || '').trim();
    if (!name) {
      return jsonResponse({ success: false, message: 'Thiếu tên khách mời' });
    }

    // Chuyển đổi raw values (groom/bride/both, vuquy/naptai/all) sang text hiển thị
    // Hỗ trợ cả raw values từ admin.js và text đã convert từ main.js
    let sideText = data.side || 'Bạn chung';
    if (data.side === 'groom') sideText = 'Nhà Trai';
    else if (data.side === 'bride') sideText = 'Nhà Gái';
    else if (data.side === 'both') sideText = 'Bạn chung';
    // Nếu đã là text tiếng Việt thì giữ nguyên (từ main.js gửi lên)
    
    let eventText = data.eventChoice || 'Cả Hai Buổi Lễ';
    if (data.eventChoice === 'vuquy') eventText = 'Lễ Vu Quy (Nhà Trai)';
    else if (data.eventChoice === 'naptai') eventText = 'Lễ Nạp Tài (Nhà Gái)';
    else if (data.eventChoice === 'all') eventText = 'Cả Hai Buổi Lễ';
    // Nếu đã là text tiếng Việt thì giữ nguyên (từ main.js gửi lên)
    
    // attending: giữ nguyên giá trị, default 'Chưa phản hồi' nếu không có
    const attending = data.attending || 'Chưa phản hồi';
    const count = data.count || '';
    const wish = data.wish || '';
    const nowTime = data.time || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // Kiểm tra xem khách đã có trong sheet chưa để cập nhật hoặc thêm mới
    const rows = sheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < rows.length; i++) {
      const existingName = String(rows[i][1] || '').trim();
      if (normalizeName(existingName) === normalizeName(name)) {
        foundRow = i + 1; // 1-indexed row number
        break;
      }
    }

    if (foundRow > 0) {
      // Cập nhật dòng khách đã tồn tại
      // Cột: A(1)=STT, B(2)=Tên, C(3)=Phía, D(4)=Tiệc, E(5)=Trạng Thái, F(6)=Số Người, G(7)=Lời Chúc, H(8)=Thời Gian
      if (data.action === 'wish') {
        // Khách gửi lời chúc từ Sổ Lưu Bút Online: chỉ cập nhật lời chúc và thời gian
        if (data.side && sideText && !rows[foundRow - 1][2]) sheet.getRange(foundRow, 3).setValue(sideText);
        if (wish) sheet.getRange(foundRow, 7).setValue(wish);
        sheet.getRange(foundRow, 8).setValue(nowTime);
      } else {
        // Cập nhật đầy đủ từ form RSVP hoặc Admin
        if (sideText) sheet.getRange(foundRow, 3).setValue(sideText);
        if (eventText) sheet.getRange(foundRow, 4).setValue(eventText);
        if (data.attending) sheet.getRange(foundRow, 5).setValue(attending);
        if (count) sheet.getRange(foundRow, 6).setValue(count);
        if (wish) sheet.getRange(foundRow, 7).setValue(wish);
        sheet.getRange(foundRow, 8).setValue(nowTime);
      }
    } else {
      // Thêm dòng mới nếu khách chưa có trong danh sách
      const nextStt = rows.length <= 1 ? 1 : rows.length;
      sheet.appendRow([
        nextStt,
        name,
        sideText,
        data.action === 'wish' ? 'Cả Hai Buổi Lễ' : eventText,
        data.action === 'wish' ? 'Chưa phản hồi' : attending,
        data.action === 'wish' ? '' : count,
        wish,
        nowTime
      ]);
    }

    return jsonResponse({ success: true, message: 'Đã ghi nhận thành công' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
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
      'Trạng Thái', 'Số Người', 'Lời Chúc', 'Thời Gian Xác Nhận'
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
