/**
 * GOOGLE APPS SCRIPT CHO HỆ THỐNG YÊU THÍCH ALBUM ẢNH CƯỚI (DÀNH CHO TRANG TÍNH MỚI)
 * Sheet ID: 1IsgJXQ_QzPfXk0iqZGp9zssxqr-A6MB3KKtra8UBS04
 * Link Sheet: https://docs.google.com/spreadsheets/d/1IsgJXQ_QzPfXk0iqZGp9zssxqr-A6MB3KKtra8UBS04/edit?usp=sharing
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HƯỚNG DẪN CÀI ĐẶT VÀO GOOGLE SHEET MỚI:
 * 1. Mở trang tính Google Sheet mới của bạn:
 *    https://docs.google.com/spreadsheets/d/1IsgJXQ_QzPfXk0iqZGp9zssxqr-A6MB3KKtra8UBS04/edit
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) → Apps Script
 * 3. Xoá hết mọi đoạn mã có sẵn, copy toàn bộ nội dung trong file này và dán vào
 * 4. Nhấn biểu tượng Lưu (Ctrl + S hoặc Cmd + S)
 * 5. Nhấn nút "Triển khai" (Deploy) ở góc trên bên phải → Chọn "Bản triển khai mới" (New deployment)
 * 6. Nhấn vào biểu tượng Bánh răng (Chọn loại) → Chọn "Ứng dụng web" (Web app)
 * 7. Cấu hình triển khai:
 *    - Mô tả: "Album Likes API"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) ⚠️ QUAN TRỌNG: Phải chọn mục này để khách có thể thả tim
 * 8. Nhấn nút "Triển khai" (Deploy) → Cấp quyền truy cập nếu Google yêu cầu
 * 9. Sao chép "URL ứng dụng web" (Web app URL có đuôi /exec) và dán vào biến GOOGLE_ALBUM_SCRIPT_URL trong album-anh-cuoi.html
 * ═══════════════════════════════════════════════════════════════════════
 */

// Thứ tự cột theo yêu cầu: id ảnh, link ảnh, tên ảnh, lượt thích
const SHEET_HEADERS = ['ID Ảnh', 'Link Ảnh', 'Tên Ảnh', 'Lượt Thích'];

/**
 * Lấy hoặc khởi tạo Sheet với đúng 4 cột tiêu đề
 */
function getTargetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getActiveSheet() || ss.getSheets()[0];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
    headerRange.setBackground('#b7791f');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, SHEET_HEADERS.length);
  }
  return sheet;
}

/**
 * Xử lý GET:
 * 1. action=like: Cộng dồn lượt thích (+1)
 * 2. action=unlike: Giảm dần lượt thích (-1), về 0 thì xoá dòng
 * 3. Mặc định (action=get_likes hoặc không truyền): Trả về danh sách đã sắp xếp nhiều like lên trước
 */
function doGet(e) {
  try {
    const sheet = getTargetSheet();
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || '').toLowerCase();

    // 1. Thao tác Like / Unlike qua GET
    if (action === 'like' || action === 'unlike' || action === 'album_like' || action === 'album_unlike') {
      return handleLikeAction(sheet, params);
    }

    // 2. Mặc định: Lấy danh sách lượt thích
    return handleGetLikes(sheet, params);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/**
 * Xử lý POST: Nhận payload JSON hoặc Form từ frontend
 */
function doPost(e) {
  try {
    const sheet = getTargetSheet();
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
    return handleLikeAction(sheet, data);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/**
 * Core Logic: Cộng dồn (+1) hoặc Giảm (-1), xoá dòng khi lượt thích về 0
 */
function handleLikeAction(sheet, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Tránh xung đột khi nhiều khách bấm like cùng lúc
  } catch (e) {
    return jsonResponse({ success: false, error: 'Hệ thống đang bận, vui lòng thử lại!' });
  }

  try {
    const rawId = String(data.id || '').trim();
    const rawName = String(data.name || '').trim();
    const rawLink = String(data.link || '').trim();
    const action = String(data.action || '').toLowerCase();

    // Xác định delta: nếu action là unlike / album_unlike hoặc delta < 0 thì là giảm
    let delta = 1;
    if (data.delta !== undefined) {
      delta = parseInt(data.delta, 10);
    } else if (action === 'unlike' || action === 'album_unlike') {
      delta = -1;
    }

    if (!rawId && !rawName) {
      return jsonResponse({ success: false, error: 'Thiếu id ảnh hoặc tên ảnh' });
    }

    const rows = sheet.getDataRange().getValues();
    let foundRow = -1;
    let currentLikes = 0;

    // Tìm kiếm ảnh theo Tên Ảnh (Cột 3) hoặc ID Ảnh (Cột 1)
    for (let i = 1; i < rows.length; i++) {
      const rowId = String(rows[i][0] || '').trim();
      const rowName = String(rows[i][2] || '').trim();

      if ((rawName && rowName.toLowerCase() === rawName.toLowerCase()) || (rawId && rowId === rawId)) {
        foundRow = i + 1; // 1-indexed trong Google Sheet
        currentLikes = parseInt(rows[i][3], 10) || 0;
        break;
      }
    }

    if (delta > 0) {
      // ── BẤM THÍCH: CỘNG DỒN ĐẾM LƯỢT THÍCH ──
      const newLikes = (foundRow > 0 ? currentLikes : 0) + delta;
      if (foundRow > 0) {
        sheet.getRange(foundRow, 4).setValue(newLikes);
        if (rawLink && !rows[foundRow - 1][1]) {
          sheet.getRange(foundRow, 2).setValue(rawLink);
        }
      } else {
        // Thứ tự: id ảnh, link ảnh, tên ảnh, lượt thích
        sheet.appendRow([rawId, rawLink, rawName, newLikes]);
      }

      return jsonResponse({
        success: true,
        action: 'like',
        id: rawId,
        name: rawName,
        likes: newLikes,
        message: 'Đã cộng dồn lượt thích'
      });
    } else {
      // ── BỎ THÍCH: GIẢM DẦN, VỀ 0 THÌ XOÁ KHỎI TRANG TÍNH ──
      if (foundRow > 0) {
        const newLikes = currentLikes + delta; // delta âm (ví dụ: -1)
        if (newLikes <= 0) {
          // Xoá hàng khỏi danh sách lượt thích khi về 0
          sheet.deleteRow(foundRow);
          return jsonResponse({
            success: true,
            action: 'deleted',
            id: rawId,
            name: rawName,
            likes: 0,
            message: 'Lượt thích về 0, đã xoá khỏi danh sách yêu thích'
          });
        } else {
          sheet.getRange(foundRow, 4).setValue(newLikes);
          return jsonResponse({
            success: true,
            action: 'unlike',
            id: rawId,
            name: rawName,
            likes: newLikes,
            message: 'Đã giảm lượt thích'
          });
        }
      } else {
        return jsonResponse({
          success: true,
          action: 'noop',
          id: rawId,
          name: rawName,
          likes: 0,
          message: 'Ảnh chưa có trong danh sách'
        });
      }
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Trả về danh sách lượt thích, sắp xếp giảm dần theo lượt thích
 */
function handleGetLikes(sheet, params) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return respond({ success: true, count: 0, data: [] }, params.callback);
  }

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][0] || '').trim();
    const link = String(rows[i][1] || '').trim();
    const name = String(rows[i][2] || '').trim();
    const likes = parseInt(rows[i][3], 10) || 0;
    if ((id || name) && likes > 0) {
      list.push({ id: id, link: link, name: name, likes: likes });
    }
  }

  // Sắp xếp: Nhiều lượt thích thì hiển thị trước, ít hiển thị sau
  list.sort((a, b) => b.likes - a.likes);

  return respond({ success: true, count: list.length, data: list }, params.callback);
}

function respond(obj, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(obj) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(obj);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
