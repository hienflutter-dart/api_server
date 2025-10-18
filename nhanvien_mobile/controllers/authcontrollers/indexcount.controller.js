// controllers/authcontrollers/indexcount.controller.js
const { query } = require('../../../config/db');
const { getBusinessDate } = require('../../../config/helper/timehelper'); // dùng helper chuẩn TZ

// Lấy 'YYYY-MM-DD' theo quy tắc 04:00; có thể override qua ?date=YYYY-MM-DD
function getBusinessDateStr(req) {
  if (req.query?.date) return String(req.query.date).slice(0, 10);
  return getBusinessDate(new Date()); // đã cắt 04:00 & TZ Asia/Ho_Chi_Minh
}

// Tiện ích thao tác chuỗi ngày
const yyyymm = (ymd) => ymd.slice(0, 7);                // 'YYYY-MM'
const monthStartStr = (ymd) => `${ymd.slice(0, 7)}-01`;  // đầu tháng 'YYYY-MM-01'

exports.getLatestIndexWithCheck = async (req, res) => {
  try {
    const bizDateStr = getBusinessDateStr(req); // 'YYYY-MM-DD'

    const rows = await query(
      `SELECT id_index, ten_index, ngay_bat_dau, ngay_ket_thuc, so_ngay_hoat_dong, ghi_chu
         FROM indexcount
        ORDER BY ngay_bat_dau DESC, id_index DESC
        LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        ok: false,
        code: 'NO_PERIODS',
        message: 'Chưa có kỳ nào trong hệ thống',
        date: bizDateStr,
        needs_new_period: true,
      });
    }

    // Vì dateStrings=true => 2 cột dưới đều là chuỗi 'YYYY-MM-DD'
    const last = rows[0];
    const start = last.ngay_bat_dau;
    const end   = last.ngay_ket_thuc;

    let inPeriod = (start <= bizDateStr && bizDateStr <= end);
    let status = 'OK';
    let reason = null;
    let needsNew = false;

    if (!inPeriod) {
      if (bizDateStr < start) {
        status = 'BEFORE';
        reason = 'DATE_BEFORE_START';
      } else { // bizDateStr > end
        const ms = monthStartStr(bizDateStr);
        if (ms > end) {
          status = 'NEED_NEW_MONTH';
          reason = 'NO_PERIOD_FOR_MONTH';
          needsNew = true;
        } else {
          status = 'AFTER';
          reason = 'DATE_AFTER_END';
          needsNew = true; // kỳ hiện tại đã qua; thường muốn tạo kỳ mới
        }
      }
    }

    return res.json({
      ok: true,
      date: bizDateStr,
      latest: last,                 // giữ nguyên ngày ở dạng string
      in_period: inPeriod,
      status,
      reason,
      needs_new_period: needsNew,
      month_of_date: yyyymm(bizDateStr),
    });
  } catch (err) {
    console.error('[getLatestIndexWithCheck] error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
};

exports.listIndexes = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const rows = await query(
      `SELECT id_index, ten_index, ngay_bat_dau, ngay_ket_thuc, so_ngay_hoat_dong, ghi_chu
         FROM indexcount
        ORDER BY ngay_bat_dau DESC, id_index DESC
        LIMIT ?`,
      [limit]
    );
    return res.json({ ok: true, items: rows });
  } catch (err) {
    console.error('[listIndexes] error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
};
