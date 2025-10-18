// controllers/chamsoc_module_controller/chamsoctre.controller.js
const { query } = require("../../../config/db");
const { getBusinessDate } = require("../../../config/helper/timehelper");
const { getIndexForDate, getIndexForNow } = require("../../../config/helper/indexcounthelper");

/* ============ utils ============ */
function isInt(v) { return Number.isInteger(Number(v)); }
async function ensureExists(table, col, val, label) {
  const r = await query(`SELECT 1 FROM ${table} WHERE ${col}=? LIMIT 1`, [val]);
  if (!r.length) throw new Error(`${label || col} không tồn tại (${val})`);
}

/* ============ GET: 1 record by id_cst (tiện debug/chi tiết) ============ */
const getChamSocTreById = async (req, res) => {
  const { id } = req.params;
  if (!isInt(id)) return res.status(400).json({ ok:false, message:"ID không hợp lệ" });

  try {
    const rows = await query(`
      SELECT c.*, l.ten_ly_do
      FROM chamsoctre c
      LEFT JOIN lydovang l ON l.id_ly_do = c.id_ly_do
      WHERE c.id_cst = ?
      LIMIT 1
    `, [id]);

    if (!rows.length) return res.status(404).json({ ok:false, message:"Không tìm thấy" });
    return res.json({ ok:true, data: rows[0] });
  } catch (err) {
    console.error("[getChamSocTreById] ", err);
    return res.status(500).json({ ok:false, message:"Lỗi máy chủ" });
  }
};

/* ============ GET: theo ID TRẺ ============ */
const getChamSocTreByTreEm = async (req, res) => {
  const { id_tre_em } = req.params;
  const { limit, offset } = req.query || {};
  if (!isInt(id_tre_em)) return res.status(400).json({ ok:false, message:"id_tre_em không hợp lệ" });

  const lim = isInt(limit) ? Number(limit) : 50;
  const off = isInt(offset) ? Number(offset) : 0;

  try {
    const rows = await query(`
      SELECT c.*, l.ten_ly_do
      FROM chamsoctre c
      LEFT JOIN lydovang l ON l.id_ly_do = c.id_ly_do
      WHERE c.id_tre_em = ?
      ORDER BY c.thoi_gian_goi DESC, c.id_cst DESC
      LIMIT ? OFFSET ?
    `, [id_tre_em, lim, off]);

    return res.json({ ok:true, data: rows });
  } catch (err) {
    console.error("[getChamSocTreByTreEm] ", err);
    return res.status(500).json({ ok:false, message:"Lỗi máy chủ" });
  }
};

/* ============ GET: theo ID NHÂN VIÊN ============ */
const getChamSocTreByNV = async (req, res) => {
  const { id_nv } = req.params;
  const { limit, offset } = req.query || {};
  if (!isInt(id_nv)) return res.status(400).json({ ok:false, message:"id_nv không hợp lệ" });

  const lim = isInt(limit) ? Number(limit) : 50;
  const off = isInt(offset) ? Number(offset) : 0;

  try {
    const rows = await query(`
      SELECT c.*, l.ten_ly_do
      FROM chamsoctre c
      LEFT JOIN lydovang l ON l.id_ly_do = c.id_ly_do
      WHERE c.id_nv = ?
      ORDER BY c.thoi_gian_goi DESC, c.id_cst DESC
      LIMIT ? OFFSET ?
    `, [id_nv, lim, off]);

    return res.json({ ok:true, data: rows });
  } catch (err) {
    console.error("[getChamSocTreByNV] ", err);
    return res.status(500).json({ ok:false, message:"Lỗi máy chủ" });
  }
};

/* ============ (tuỳ chọn) GET: theo LỚP của “ngày nghiệp vụ hôm nay” ============ */
const getChamSocTreTodayByLop = async (req, res) => {
  const { id_lop } = req.params;
  if (!isInt(id_lop)) return res.status(400).json({ ok:false, message:"id_lop không hợp lệ" });

  try {
    const idx = await getIndexForNow();
    if (!idx) return res.status(404).json({ ok:false, message:"Không tìm thấy kỳ cho ngày hiện tại" });

    const rows = await query(`
      SELECT c.*, l.ten_ly_do
      FROM chamsoctre c
      LEFT JOIN lydovang l ON l.id_ly_do = c.id_ly_do
      WHERE c.id_lop = ? AND c.id_index = ?
      ORDER BY c.thoi_gian_goi DESC, c.id_cst DESC
    `, [id_lop, idx.id_index]);

    return res.json({ ok:true, id_index: idx.id_index, data: rows });
  } catch (err) {
    console.error("[getChamSocTreTodayByLop] ", err);
    return res.status(500).json({ ok:false, message:"Lỗi máy chủ" });
  }
};

/* ============ INSERT ============ */
/**
 * Body tối thiểu:
 * - id_tre_em, id_lop, id_nhom_hoc, id_nv
 * - id_index: nếu không gửi thì tự xác định từ ngày nghiệp vụ hiện tại
 * Trường tùy chọn:
 * - id_ly_do (INT | null), noi_dung_trao_doi (TEXT | null), ngay_hen_hoc_lai (YYYY-MM-DD | null)
 * - thoi_gian_goi dùng default CURRENT_TIMESTAMP nên KHÔNG cần gửi
 */
const insertChamSocTre = async (req, res) => {
  try {
    let {
      id_tre_em, id_lop, id_nhom_hoc, id_index, id_nv,
      id_ly_do = null, noi_dung_trao_doi = null, ngay_hen_hoc_lai = null,
    } = req.body || {};

    // bắt buộc
    const required = { id_tre_em, id_lop, id_nhom_hoc, id_nv };
    for (const [k, v] of Object.entries(required)) {
      if (v === undefined || v === null || v === "") {
        return res.status(400).json({ ok:false, message:`Thiếu trường ${k}` });
      }
      if (!isInt(v)) {
        return res.status(400).json({ ok:false, message:`${k} phải là số nguyên` });
      }
    }

    // id_index: nếu không truyền thì tự tìm theo ngày nghiệp vụ hiện tại
    if (!isInt(id_index)) {
      const idx = await getIndexForNow();
      if (!idx) return res.status(400).json({ ok:false, message:"Không xác định được kỳ cho ngày hiện tại" });
      id_index = idx.id_index;
    }

    // Validate FK
    await ensureExists("treem", "id_tre_em", id_tre_em, "Trẻ em");
    await ensureExists("lophoc", "id_lop", id_lop, "Lớp học");
    await ensureExists("nhomhoc", "id_nhom_hoc", id_nhom_hoc, "Nhóm học");
    await ensureExists("nhanvien", "id_nv", id_nv, "Nhân viên");
    await ensureExists("indexcount", "id_index", id_index, "Kỳ");
    if (id_ly_do != null && id_ly_do !== "" && isInt(id_ly_do)) {
      await ensureExists("lydovang", "id_ly_do", id_ly_do, "Lý do vắng");
    } else {
      id_ly_do = null;
    }

    const result = await query(`
      INSERT INTO chamsoctre (
        id_tre_em, id_lop, id_nhom_hoc, id_index, id_nv,
        id_ly_do, noi_dung_trao_doi, ngay_hen_hoc_lai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_tre_em, id_lop, id_nhom_hoc, id_index, id_nv,
      id_ly_do, noi_dung_trao_doi, ngay_hen_hoc_lai
    ]);

    return res.status(201).json({ ok:true, id_cst: result.insertId });
  } catch (err) {
    console.error("[insertChamSocTre] ", err);
    return res.status(500).json({ ok:false, message: String(err.message || "Lỗi máy chủ") });
  }
};

/* ============ DELETE ============ */
const deleteChamSocTre = async (req, res) => {
  const { id } = req.params;
  if (!isInt(id)) return res.status(400).json({ ok:false, message:"ID không hợp lệ" });

  try {
    const result = await query(`DELETE FROM chamsoctre WHERE id_cst = ?`, [id]);
    if (!result.affectedRows) return res.status(404).json({ ok:false, message:"Không tìm thấy bản ghi" });
    return res.json({ ok:true, message:"Đã xóa" });
  } catch (err) {
    console.error("[deleteChamSocTre] ", err);
    return res.status(500).json({ ok:false, message:"Lỗi máy chủ" });
  }
};

// GET /chamsoctre/lydovang
const getAllLyDoVang = async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id_ly_do, ten_ly_do
         FROM lydovang
        ORDER BY id_ly_do ASC`
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("[getAllLyDoVang] ", err);
    return res.status(500).json({ ok: false, message: "Lỗi khi lấy lý do vắng" });
  }
};

module.exports = {
  getChamSocTreById,
  getChamSocTreByTreEm,
  getChamSocTreByNV,
  getChamSocTreTodayByLop,
  insertChamSocTre,
  deleteChamSocTre,
  getAllLyDoVang,
};
