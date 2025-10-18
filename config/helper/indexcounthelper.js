// config/helper/indexcounthelper.js
const { query } = require("../../config/db");
const { getBusinessDate } = require("../../config/helper/timehelper");

// Lấy kỳ bao trùm một ngày nghiệp vụ 'YYYY-MM-DD'
async function getIndexForDate(bizDate) {
  const rows = await query(
    `SELECT * FROM indexcount
     WHERE ngay_bat_dau <= ? AND ngay_ket_thuc >= ?
     ORDER BY ngay_bat_dau DESC
     LIMIT 1`,
    [bizDate, bizDate]
  );
  return rows[0] || null;
}

// Tiện ích: lấy kỳ cho "ngày nghiệp vụ" hiện tại (cutoff 04:00)
async function getIndexForNow() {
  const bizDate = getBusinessDate(new Date()); // 'YYYY-MM-DD'
  return await getIndexForDate(bizDate);
}

module.exports = { getIndexForDate, getIndexForNow };
