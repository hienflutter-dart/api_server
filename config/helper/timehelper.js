// Tính "ngày nghiệp vụ" theo mốc 04:00 sáng, timezone Asia/Ho_Chi_Minh.
// Trả về string 'YYYY-MM-DD'. Có thể truyền now để test.
//config/helper/timehelper.js

function formatYMD(d, timeZone = 'Asia/Ho_Chi_Minh') {
  const dtf = new Intl.DateTimeFormat('en-CA', { // en-CA => YYYY-MM-DD
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return dtf.format(d);
}

function getLocalParts(d, timeZone = 'Asia/Ho_Chi_Minh') {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = f.formatToParts(d).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return {
    year: +parts.year, month: +parts.month, day: +parts.day,
    hour: +parts.hour, minute: +parts.minute, second: +parts.second,
  };
}

function getBusinessDate(now = new Date(), cutoffHour = 4, timeZone = 'Asia/Ho_Chi_Minh') {
  const p = getLocalParts(now, timeZone);
  // "Nửa đêm local" (UTC-based) của ngày hiện tại theo timezone VN:
  const baseUTC = Date.UTC(p.year, p.month - 1, p.day); // 00:00 local-day
  const isBeforeCutoff = p.hour < cutoffHour;
  const d = new Date(baseUTC - (isBeforeCutoff ? 24 : 0) * 3600 * 1000); // lùi 1 ngày nếu < 04:00
  return formatYMD(d, timeZone);
}

module.exports = { getBusinessDate };
