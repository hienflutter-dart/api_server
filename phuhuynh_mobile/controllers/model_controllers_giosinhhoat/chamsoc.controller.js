// controllers/chamSoc.controller.js
const { query } = require('../../../config/db');
// wrapper mysql2/promise của bạn

// Ép số nguyên an toàn
const toInt = (v, def = null) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

// Ép bool -> 0/1
const to01 = (v) => {
  if (v === true || v === 1 || v === '1' || v === 'true') return 1;
  return 0;
};

// Clamp cảm xúc 1..5 (mặc định 3: trung tính)
const clampEmotion = (v) => {
  const n = toInt(v, 3);
  return Math.min(5, Math.max(1, n));
};

// yyyy-mm-dd (không time)
const toDateOnly = (s) => (typeof s === 'string' ? s.slice(0, 10) : null);

/**
 * UPSERT 1 bản ghi (id_tre_em + ngay_diem_danh là duy nhất)
 * YÊU CẦU: có unique index:
 * ALTER TABLE cham_soc ADD UNIQUE KEY uniq_child_date (id_tre_em, ngay_diem_danh);
 */
exports.upsert = async (req, res) => {
  try {
    const {
      id_tre_em,
      ten_day_du,
      ten_thuong_goi,
      id_lop,
      id_nhom_hoc,
      id_index,
      id_nv,
      ngay_diem_danh,
      cs_sang,
      cs_chinh,
      cs_xe,
      cs_cam_xuc,
      cs_text,
    } = req.body || {};

    const idTre = toInt(id_tre_em);
    const idLop = toInt(id_lop);
    const idNv = toInt(id_nv);
    const ngay = toDateOnly(ngay_diem_danh);

    if (!idTre || !ngay) {
      return res.status(400).json({ message: 'Thiếu id_tre_em hoặc ngay_diem_danh' });
    }

    const sql = `
      INSERT INTO chamsoc
      (id_tre_em, ten_day_du, ten_thuong_goi, id_lop, id_nhom_hoc, id_index, id_nv,
       ngay_diem_danh, cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ten_day_du = VALUES(ten_day_du),
        ten_thuong_goi = VALUES(ten_thuong_goi),
        id_lop = VALUES(id_lop),
        id_nhom_hoc = VALUES(id_nhom_hoc),
        id_index = VALUES(id_index),
        id_nv = VALUES(id_nv),
        cs_sang = VALUES(cs_sang),
        cs_chinh = VALUES(cs_chinh),
        cs_xe = VALUES(cs_xe),
        cs_cam_xuc = VALUES(cs_cam_xuc),
        cs_text = VALUES(cs_text)
    `;

    const params = [
      idTre,
      ten_day_du ?? null,
      ten_thuong_goi ?? null,
      idLop ?? null,
      toInt(id_nhom_hoc),
      toInt(id_index),
      idNv ?? null,
      ngay,
      to01(cs_sang),
      to01(cs_chinh),
      to01(cs_xe),
      clampEmotion(cs_cam_xuc),
      cs_text ?? null,
    ];

    const result = await query(sql, params);
    return res.json({ ok: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error('chamsoc.upsert error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/**
 * BULK UPSERT nhiều bản ghi (transaction)
 * body: { items: [ {..record..}, ... ] }
 */
exports.bulkUpsert = async (req, res) => {
  const conn = await getConnection();
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Thiếu items' });
    }

    await conn.beginTransaction();

    const sql = `
      INSERT INTO chamsoc
      (id_tre_em, ten_day_du, ten_thuong_goi, id_lop, id_nhom_hoc, id_index, id_nv,
       ngay_diem_danh, cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ten_day_du = VALUES(ten_day_du),
        ten_thuong_goi = VALUES(ten_thuong_goi),
        id_lop = VALUES(id_lop),
        id_nhom_hoc = VALUES(id_nhom_hoc),
        id_index = VALUES(id_index),
        id_nv = VALUES(id_nv),
        cs_sang = VALUES(cs_sang),
        cs_chinh = VALUES(cs_chinh),
        cs_xe = VALUES(cs_xe),
        cs_cam_xuc = VALUES(cs_cam_xuc),
        cs_text = VALUES(cs_text)
    `;

    for (const it of items) {
      const params = [
        toInt(it.id_tre_em),
        it.ten_day_du ?? null,
        it.ten_thuong_goi ?? null,
        toInt(it.id_lop),
        toInt(it.id_nhom_hoc),
        toInt(it.id_index),
        toInt(it.id_nv),
        toDateOnly(it.ngay_diem_danh),
        to01(it.cs_sang),
        to01(it.cs_chinh),
        to01(it.cs_xe),
        clampEmotion(it.cs_cam_xuc),
        it.cs_text ?? null,
      ];

      if (!params[0] || !params[7]) {
        throw new Error('Thiếu id_tre_em hoặc ngay_diem_danh trong 1 item');
      }

      await conn.execute(sql, params);
    }

    await conn.commit();
    return res.json({ ok: true, count: items.length });
  } catch (err) {
    await conn.rollback();
    console.error('chamsoc.bulkUpsert error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
};

/**
 * Lấy danh sách (lọc theo lớp/ngày/khoảng ngày)
 * /cham-soc?lop=2&date=2024-09-20
 * /cham-soc?lop=2&from=2024-09-01&to=2024-09-30
 * /cham-soc?tre=5&from=...&to=...
 */
exports.list = async (req, res) => {
  try {
    const { lop, tre, date, from, to, page = '1', limit = '100' } = req.query;

    const where = [];
    const args = [];

    if (lop) { where.push('id_lop = ?'); args.push(toInt(lop)); }
    if (tre) { where.push('id_tre_em = ?'); args.push(toInt(tre)); }
    if (date) { where.push('ngay_diem_danh = ?'); args.push(toDateOnly(date)); }
    if (from && to) { where.push('ngay_diem_danh BETWEEN ? AND ?'); args.push(toDateOnly(from), toDateOnly(to)); }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const p = Math.max(1, toInt(page, 1));
    const l = Math.min(1000, Math.max(1, toInt(limit, 100)));
    const offset = (p - 1) * l;

    const rows = await query(
      `SELECT *
       FROM chamsoc
       ${whereSql}
       ORDER BY ngay_diem_danh DESC, id_tre_em ASC
       LIMIT ? OFFSET ?`,
      [...args, l, offset]
    );

    return res.json(rows);
  } catch (err) {
    console.error('chamsoc.list error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/**
 * Lấy 1 record theo tre + date (dùng cho màn chi tiết)
 * /cham-soc/one?tre=5&date=2024-09-21
 */
exports.getOneByChildDate = async (req, res) => {
  try {
    const idTre = toInt(req.query.tre);
    const ngay = toDateOnly(req.query.date);
    if (!idTre || !ngay) {
      return res.status(400).json({ message: 'Thiếu tre hoặc date' });
    }
    const rows = await query(
      `SELECT * FROM chamsoc WHERE id_tre_em = ? AND ngay_diem_danh = ? LIMIT 1`,
      [idTre, ngay]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Không có dữ liệu' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('chamsoc.getOneByChildDate error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
