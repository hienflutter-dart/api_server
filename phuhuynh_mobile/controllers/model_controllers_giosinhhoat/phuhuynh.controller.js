const { query } = require('../../../config/db');

function toInt(v){ const n = Number.parseInt(v, 10); return Number.isNaN(n) ? null : n; }
function uniq(arr){ return Array.from(new Set(arr)); }


function parseIdList(any) {
  if (any == null) return [];
  if (Array.isArray(any)) return uniq(any.map(toInt).filter(Number.isInteger));

  // string
  const s = String(any).trim();
  if (!s) return [];
  try {
    const js = JSON.parse(s);
    if (Array.isArray(js)) return uniq(js.map(toInt).filter(Number.isInteger));
  } catch (_) { /* not JSON */ }

  // fallback: tách theo non-digits
  const ids = s.split(/[^0-9]+/).map(toInt).filter(Number.isInteger);
  return uniq(ids);
}

/**
 * GET /api/phuhuynh/:id_phu_huynh/tre-em
 */
exports.getTreEmByPhuHuynh = async (req, res) => {
  try {
    const id_phu_huynh = toInt(req.params.id_phu_huynh);
    if (id_phu_huynh == null) return res.status(400).json({ message: 'id_phu_huynh không hợp lệ' });

    // lấy list_id_tre_em từ bảng phuhuynh
    const [u] = await query(
      `SELECT list_id_tre_em
         FROM phuhuynh
        WHERE id_phu_huynh = ?
        LIMIT 1`,
      [id_phu_huynh]
    );
    if (!u) return res.json({ count: 0, items: [] });

    const ids = parseIdList(u.list_id_tre_em);
    if (ids.length === 0) return res.json({ count: 0, items: [] });

    // tránh IN quá dài: chia chunk nếu cần
    const chunkSize = 1000;
    let rows = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const part = await query(
        `
        SELECT
          t.id_tre_em,
          t.ten_day_du,
          t.ten_thuong_goi,
          t.gioi_tinh,
          DATE_FORMAT(t.ngay_sinh, '%Y-%m-%d') AS ngay_sinh

        FROM treem t
        WHERE t.id_tre_em IN (${placeholders})
        ORDER BY t.ten_day_du
        `,
        chunk
      );
      rows = rows.concat(part || []);
    }

    return res.json({ count: rows.length, items: rows });
  } catch (err) {
    console.error('getTreEmByPhuHuynh error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/**
 * POST /api/tre-em/by-ids
 * body: { ids: number[] | string(json) | "1,2,3" }
 */
exports.getTreEmByIds = async (req, res) => {
  try {
    const ids = parseIdList(req.body?.ids);
    if (ids.length === 0) return res.json({ count: 0, items: [] });

    const chunkSize = 1000;
    let rows = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const part = await query(
        `
        SELECT
          t.id_tre_em,
          t.ten_day_du,
          t.ten_thuong_goi,
          t.gioi_tinh,
          DATE_FORMAT(t.ngay_sinh, '%Y-%m-%d') AS ngay_sinh
        FROM treem t
        WHERE t.id_tre_em IN (${placeholders})
        ORDER BY t.ten_day_du
        `,
        chunk
      );
      rows = rows.concat(part || []);
    }

    return res.json({ count: rows.length, items: rows });
  } catch (err) {
    console.error('getTreEmByIds error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.loginPhuHuynh = async (req, res) => {
  try {
    const { ten_tai_khoan, mat_khau } = req.body || {};
    if (!ten_tai_khoan || !mat_khau) {
      return res.status(400).json({ message: 'Thiếu tên tài khoản hoặc mật khẩu' });
    }

    // dùng ? để tránh lỗi cú pháp & chống injection
    const rows = await query(
      `SELECT id_phu_huynh, ten_tai_khoan, mat_khau, trang_thai,
              list_id_tre_em, list_tre_em, list_rtsp, list_ten_lop,
              list_devices, qr_image, ngay_cap, ngay_cap_nhat
       FROM phuhuynh
       WHERE ten_tai_khoan = ?
       LIMIT 1`,
      [ten_tai_khoan]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }

    const user = rows[0];

    // kiểm tra trạng thái
    if (user.trang_thai !== 1) {
      return res.status(403).json({ message: 'Tài khoản đang bị khóa hoặc chưa kích hoạt' });
    }

    // so khớp mật khẩu (giả định DB lưu bcrypt-hash)
   
    // 🔑 So sánh trực tiếp văn bản thuần
    if (mat_khau !== user.mat_khau) {
        return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
      }

    // trả về profile (không trả password)
    return res.json({
      profile: {
        id_phu_huynh: user.id_phu_huynh,
        ten_tai_khoan: user.ten_tai_khoan,
        list_id_tre_em: safeParseJSON(user.list_id_tre_em),
        list_tre_em: safeParseJSON(user.list_tre_em),
        list_rtsp: safeParseJSON(user.list_rtsp),
        list_ten_lop: safeParseJSON(user.list_ten_lop),
        list_devices: safeParseJSON(user.list_devices),
        qr_image: user.qr_image,
        ngay_cap: user.ngay_cap,
        ngay_cap_nhat: user.ngay_cap_nhat
      }
    });
  } catch (err) {
    console.error('loginPhuHuynh error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

function safeParseJSON(v) {
  if (v == null) return null;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (_) { return v; }
}
