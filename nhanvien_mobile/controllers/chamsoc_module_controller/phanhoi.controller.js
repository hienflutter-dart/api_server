const { query } = require('../../../config/db');

/** Helper: WHERE mặc định bỏ trạng thái đã xóa (0) */
function buildWhere({ status, type, idTreEm, q }) {
  const wh = ["p.trang_thai <> 0"]; // hiển thị 1,2,3
  const params = [];
  if (status !== undefined) { wh.push("p.trang_thai = ?"); params.push(Number(status)); }
  if (type   !== undefined) { wh.push("p.id_loai_phan_hoi = ?"); params.push(Number(type)); }
  if (idTreEm!== undefined) { wh.push("p.id_tre_em = ?"); params.push(Number(idTreEm)); }
  if (q) {
    wh.push("(p.noi_dung LIKE ? OR l.ten_loai_phan_hoi LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  return { whereSql: "WHERE " + wh.join(" AND "), params };
}

/** GET /phanhoi?status=&type=&q=&limit=&offset=  (không JOIN treem) */
const getPhanHoi = async (req, res) => {
  try {
    const { status, type, q, limit = 50, offset = 0 } = req.query;
    const { whereSql, params } = buildWhere({ status, type, q });

    const sql = `
      SELECT
        p.*,
        l.ten_loai_phan_hoi,
        (
          SELECT GROUP_CONCAT(ph.id_phu_huynh ORDER BY ph.id_phu_huynh)
          FROM phuhuynh ph
          WHERE FIND_IN_SET(
            CAST(p.id_tre_em AS CHAR),
            REPLACE(REPLACE(REPLACE(ph.list_id_tre_em, ' ', ''), '[', ''), ']', '')
          )
        ) AS ids_phu_huynh,
        (
          SELECT GROUP_CONCAT(ph.ten_tai_khoan ORDER BY ph.id_phu_huynh)
          FROM phuhuynh ph
          WHERE FIND_IN_SET(
            CAST(p.id_tre_em AS CHAR),
            REPLACE(REPLACE(REPLACE(ph.list_id_tre_em, ' ', ''), '[', ''), ']', '')
          )
        ) AS ten_tai_khoan_phu_huynh
      FROM phanhoi p
      LEFT JOIN loaiphanhoi l ON l.id_loai_phan_hoi = p.id_loai_phan_hoi
      ${whereSql}
      ORDER BY p.ngay_phan_hoi DESC, p.id_phan_hoi DESC
      LIMIT ? OFFSET ?`;
    const rows = await query(sql, [...params, Number(limit), Number(offset)]);
    return res.json(rows);
  } catch (err) {
    console.error("[getPhanHoi] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn phản hồi");
  }
};

/** GET /phanhoi/:id */
const getPhanHoiById = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) return res.status(400).send("ID phản hồi không hợp lệ");
  try {
    const sql = `
      SELECT
        p.*,
        l.ten_loai_phan_hoi,
        (
          SELECT GROUP_CONCAT(ph.id_phu_huynh ORDER BY ph.id_phu_huynh)
          FROM phuhuynh ph
          WHERE FIND_IN_SET(
            CAST(p.id_tre_em AS CHAR),
            REPLACE(REPLACE(REPLACE(ph.list_id_tre_em, ' ', ''), '[', ''), ']', '')
          )
        ) AS ids_phu_huynh,
        (
          SELECT GROUP_CONCAT(ph.ten_tai_khoan ORDER BY ph.id_phu_huynh)
          FROM phuhuynh ph
          WHERE FIND_IN_SET(
            CAST(p.id_tre_em AS CHAR),
            REPLACE(REPLACE(REPLACE(ph.list_id_tre_em, ' ', ''), '[', ''), ']', '')
          )
        ) AS ten_tai_khoan_phu_huynh
      FROM phanhoi p
      LEFT JOIN loaiphanhoi l ON l.id_loai_phan_hoi = p.id_loai_phan_hoi
      WHERE p.id_phan_hoi = ? AND p.trang_thai <> 0`;
    const rows = await query(sql, [id]);
    if (rows.length === 0) return res.status(404).send("Không tìm thấy phản hồi");
    return res.json(rows[0]);
  } catch (err) {
    console.error("[getPhanHoiById] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn phản hồi");
  }
};

/** GET /phanhoi/tre/:id_tre_em */
const getPhanHoiByTreEm = async (req, res) => {
  const { id_tre_em } = req.params;
  if (!Number.isInteger(Number(id_tre_em))) {
    return res.status(400).send("ID trẻ em không hợp lệ");
  }
  try {
    const sql = `
      SELECT
        p.*,
        l.ten_loai_phan_hoi,
        (
          SELECT GROUP_CONCAT(ph.id_phu_huynh ORDER BY ph.id_phu_huynh)
          FROM phuhuynh ph
          WHERE FIND_IN_SET(
            CAST(p.id_tre_em AS CHAR),
            REPLACE(REPLACE(REPLACE(ph.list_id_tre_em, ' ', ''), '[', ''), ']', '')
          )
        ) AS ids_phu_huynh,
        (
          SELECT GROUP_CONCAT(ph.ten_tai_khoan ORDER BY ph.id_phu_huynh)
          FROM phuhuynh ph
          WHERE FIND_IN_SET(
            CAST(p.id_tre_em AS CHAR),
            REPLACE(REPLACE(REPLACE(ph.list_id_tre_em, ' ', ''), '[', ''), ']', '')
          )
        ) AS ten_tai_khoan_phu_huynh
      FROM phanhoi p
      LEFT JOIN loaiphanhoi l ON l.id_loai_phan_hoi = p.id_loai_phan_hoi
      WHERE p.id_tre_em = ? AND p.trang_thai IN (1, 2)
      ORDER BY p.ngay_phan_hoi DESC, p.id_phan_hoi DESC
    `;
    const rows = await query(sql, [id_tre_em]);
    return res.json(rows);
  } catch (err) {
    console.error("[getPhanHoiByTreEm] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn phản hồi");
  }
};

/** INSERT: mặc định hinh_thuc=0 (ẩn danh), trang_thai=1 (mới) */
const insertPhanHoi = async (req, res) => {
  try {
    const {
      id_loai_phan_hoi = null,
      noi_dung,
      hinh_thuc = 0,   // 0=ẩn danh, 1=trực tiếp
      id_tre_em = null
    } = req.body;

    if (!noi_dung) return res.status(400).send("Thiếu trường bắt buộc: noi_dung");
    if (![0,1].includes(Number(hinh_thuc))) return res.status(400).send("hinh_thuc phải là 0 hoặc 1");

    if (id_loai_phan_hoi) {
      const chk = await query("SELECT 1 FROM loaiphanhoi WHERE id_loai_phan_hoi = ?", [id_loai_phan_hoi]);
      if (chk.length === 0) return res.status(400).send("ID loại phản hồi không tồn tại");
    }
    if (id_tre_em) {
      const chk = await query("SELECT 1 FROM treem WHERE id_tre_em = ?", [id_tre_em]);
      if (chk.length === 0) return res.status(400).send("ID trẻ em không tồn tại");
    }

    const sql = `
      INSERT INTO phanhoi (id_loai_phan_hoi, noi_dung, hinh_thuc, trang_thai, id_tre_em)
      VALUES (?, ?, ?, 1, ?)
    `;
    const result = await query(sql, [id_loai_phan_hoi, noi_dung, Number(hinh_thuc), id_tre_em]);
    return res.status(201).json({ id_phan_hoi: result.insertId });
  } catch (err) {
    console.error("[insertPhanHoi] Error:", err);
    return res.status(500).send("Lỗi khi thêm phản hồi");
  }
};

/** UPDATE: KHÔNG cập nhật trang_thai */
const updatePhanHoi = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) return res.status(400).send("ID phản hồi không hợp lệ");

  try {
    const ex = await query("SELECT trang_thai FROM phanhoi WHERE id_phan_hoi = ?", [id]);
    if (ex.length === 0) return res.status(404).send("Không tìm thấy phản hồi");
    if (ex[0].trang_thai === 0) return res.status(409).send("Bản ghi đã xóa, không thể cập nhật");

    const {
      id_loai_phan_hoi = null,
      noi_dung,
      hinh_thuc = 0,
      id_tre_em = null
    } = req.body;

    if (!noi_dung) return res.status(400).send("Thiếu trường bắt buộc: noi_dung");
    if (![0,1].includes(Number(hinh_thuc))) return res.status(400).send("hinh_thuc phải là 0 hoặc 1");

    if (id_loai_phan_hoi) {
      const chk = await query("SELECT 1 FROM loaiphanhoi WHERE id_loai_phan_hoi = ?", [id_loai_phan_hoi]);
      if (chk.length === 0) return res.status(400).send("ID loại phản hồi không tồn tại");
    }
    if (id_tre_em) {
      const chk = await query("SELECT 1 FROM treem WHERE id_tre_em = ?", [id_tre_em]);
      if (chk.length === 0) return res.status(400).send("ID trẻ em không tồn tại");
    }

    const sql = `
      UPDATE phanhoi SET
        id_loai_phan_hoi = ?, noi_dung = ?, hinh_thuc = ?, id_tre_em = ?
      WHERE id_phan_hoi = ? AND trang_thai <> 0
    `;
    await query(sql, [id_loai_phan_hoi, noi_dung, Number(hinh_thuc), id_tre_em, id]);
    return res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    console.error("[updatePhanHoi] Error:", err);
    return res.status(500).send("Lỗi khi cập nhật phản hồi");
  }
};

/** PATCH /phanhoi/:id/seen → set trang_thai=2 (không chạm 0) */
const markSeenPhanHoi = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).send("ID phản hồi không hợp lệ");
  }
  try {
    const sql = `
      UPDATE phanhoi
      SET trang_thai = 2
      WHERE id_phan_hoi = ? AND trang_thai = 1
    `;
    const result = await query(sql, [id]);
    if (result.affectedRows === 0) {
      // không ở trạng thái 1 hoặc bản ghi đã bị xóa (0)
      return res.status(409).json({ message: "Không thể đánh dấu: phiếu không ở trạng thái 1" });
    }
    return res.json({ message: "Đã đánh dấu phản hồi đã xem" });
  } catch (err) {
    console.error("[markSeenPhanHoi] Error:", err);
    return res.status(500).send("Lỗi khi cập nhật phản hồi đã xem");
  }
};

/** DELETE /phanhoi/:id?action=hide|revoke
 *  hide (default) → trang_thai=0, revoke → trang_thai=3
 */
const deleteOrRevokePhanHoi = async (req, res) => {
  const { id } = req.params;
  const action = (req.query.action || "hide").toLowerCase();
  if (!Number.isInteger(Number(id))) return res.status(400).send("ID phản hồi không hợp lệ");

  const newStatus = action === "revoke" ? 3 : 0;

  try {
    const result = await query(
      "UPDATE phanhoi SET trang_thai = ? WHERE id_phan_hoi = ? AND trang_thai <> 0",
      [newStatus, id]
    );
    if (result.affectedRows === 0) return res.status(404).send("Không tìm thấy phản hồi");
    return res.json({ message: newStatus === 3 ? "Đã thu hồi phản hồi" : "Đã ẩn phản hồi" });
  } catch (err) {
    console.error("[deleteOrRevokePhanHoi] Error:", err);
    return res.status(500).send("Lỗi khi cập nhật trạng thái phản hồi");
  }
};

/** GET /phanhoi/check-new?after_id=&since=
 *  Chỉ đếm phản hồi trạng thái = 1 (mới/đang hoạt động)
 */
const checkNewPhanHoi = async (req, res) => {
  try {
    const { id_tre_em, type } = req.query; // tùy chọn

    let sql = "SELECT COUNT(*) AS cnt FROM phanhoi p WHERE p.trang_thai IN (1, 3)";
    const params = [];
    if (id_tre_em !== undefined) { sql += " AND p.id_tre_em = ?";        params.push(Number(id_tre_em)); }
    if (type      !== undefined) { sql += " AND p.id_loai_phan_hoi = ?"; params.push(Number(type)); }

    const [row] = await query(sql, params);
    const count = Number(row?.cnt || 0);
    return res.json({ has_new: count > 0, count }); // chỉ trả 2 field này
  } catch (err) {
    console.error("[checkNewPhanHoi] Error:", err);
    return res.status(500).send("Lỗi khi kiểm tra phản hồi mới");
  }
};

module.exports = {
  getPhanHoi,
  getPhanHoiById,
  getPhanHoiByTreEm,
  insertPhanHoi,
  updatePhanHoi,
  hidePhanHoi: deleteOrRevokePhanHoi, // giữ tên cũ ở routes, nhưng đã hỗ trợ revoke
  checkNewPhanHoi,
  markSeenPhanHoi,
};
