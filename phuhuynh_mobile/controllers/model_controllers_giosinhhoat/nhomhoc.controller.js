const { query } = require('../../../config/db');
/**
 * Lấy tất cả nhóm học
 */
const getAllNhomhoc = async (req, res) => {
  console.log("[getNhomhoc] Fetching all groups");
  try {
    const sql = `SELECT * FROM nhomhoc`;
    const rows = await query(sql);
    if (rows.length === 0) {
      console.info("[getNhomhoc] No groups found");
      return res.status(404).send("Không có nhóm học nào");
    }
    console.log(`[getNhomhoc] Retrieved ${rows.length} records`);
    return res.json(rows);
  } catch (err) {
    console.error("[getNhomhoc] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};

/**
 * Lấy nhóm học theo ID
 */
const getNhomhocById = async (req, res) => {
  const { id } = req.params;
  console.log(`[getNhomhocById] Fetching group ID=${id}`);
  if (!Number.isInteger(Number(id))) {
    console.warn(`[getNhomhocById] Invalid ID: ${id}`);
    return res.status(400).send("ID nhóm học không hợp lệ");
  }
  try {
    const sql = `SELECT * FROM nhomhoc WHERE id_nhom_hoc = ?`;
    const rows = await query(sql, [id]);
    if (rows.length === 0) {
      console.info(`[getNhomhocById] No group found for ID=${id}`);
      return res.status(404).send("Không tìm thấy nhóm học");
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("[getNhomhocById] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};

/**
 * Lấy nhóm học theo id_lop
 */
const getNhomhocByIdLop = async (req, res) => {
  const { id_lop } = req.params;
  console.log(`[getNhomhocByIdLop] Fetching groups for class ID=${id_lop}`);
  if (!Number.isInteger(Number(id_lop))) {
    console.warn(`[getNhomhocByIdLop] Invalid class ID: ${id_lop}`);
    return res.status(400).send("ID lớp học không hợp lệ");
  }
  try {
    const sql = `SELECT * FROM nhomhoc WHERE id_lop = ?`;
    const rows = await query(sql, [id_lop]);
    if (rows.length === 0) {
      console.info(`[getNhomhocByIdLop] No groups found for class ID=${id_lop}`);
      return res.status(404).send("Không tìm thấy nhóm học nào cho lớp này");
    }
    console.log(`[getNhomhocByIdLop] Retrieved ${rows.length} records`);
    return res.json(rows);
  } catch (err) {
    console.error("[getNhomhocByIdLop] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};

/**
 * Thêm nhóm học
 * Lưu ý: bảng của bạn đang NOT NULL cho `ten_nhom_hoc`, `ghi_chu`, `id_lop`
 * => ép `ghi_chu` thành chuỗi rỗng nếu không gửi.
 */
const addNhomhoc = async (req, res) => {
  console.log("[insertNhomhoc] Creating a new group", req.body);
  try {
    const { ten_nhom_hoc, ghi_chu, id_lop } = req.body || {};

    if (!ten_nhom_hoc || !Number.isInteger(Number(id_lop))) {
      console.warn("[insertNhomhoc] Missing/invalid required fields");
      return res
        .status(400)
        .send("Thiếu hoặc không hợp lệ: ten_nhom_hoc, id_lop");
    }

    const sql = `
      INSERT INTO nhomhoc (ten_nhom_hoc, ghi_chu, id_lop)
      VALUES (?, ?, ?)
    `;
    const params = [
      String(ten_nhom_hoc).trim(),
      ghi_chu !== undefined && ghi_chu !== null ? String(ghi_chu).trim() : "",
      Number(id_lop),
    ];

    const result = await query(sql, params);
    console.log(`[insertNhomhoc] Inserted group with ID=${result.insertId}`);
    return res.status(201).json({ id_nhom_hoc: result.insertId });
  } catch (err) {
    console.error("[insertNhomhoc] Error:", err);
    return res.status(500).send("Lỗi khi thêm nhóm học");
  }
};

/**
 * Cập nhật nhóm học
 * Theo style treem: cập nhật full bộ 3 trường.
 */
const updateNhomhoc = async (req, res) => {
  const { id } = req.params;
  console.log(`[updateNhomhoc] Updating group ID=${id}`, req.body);

  if (!Number.isInteger(Number(id))) {
    console.warn(`[updateNhomhoc] Invalid ID parameter: ${id}`);
    return res.status(400).send("ID nhóm học không hợp lệ");
  }

  try {
    const { ten_nhom_hoc, ghi_chu, id_lop } = req.body || {};

    if (!ten_nhom_hoc || !Number.isInteger(Number(id_lop))) {
      console.warn("[updateNhomhoc] Missing/invalid required fields");
      return res
        .status(400)
        .send("Thiếu hoặc không hợp lệ: ten_nhom_hoc, id_lop");
    }

    const sql = `
      UPDATE nhomhoc
      SET ten_nhom_hoc = ?, ghi_chu = ?, id_lop = ?
      WHERE id_nhom_hoc = ?
    `;
    const params = [
      String(ten_nhom_hoc).trim(),
      ghi_chu !== undefined && ghi_chu !== null ? String(ghi_chu).trim() : "",
      Number(id_lop),
      Number(id),
    ];

    const result = await query(sql, params);
    if (result.affectedRows === 0) {
      console.info(`[updateNhomhoc] No group found to update for ID=${id}`);
      return res.status(404).send("Không tìm thấy nhóm học");
    }

    console.log(`[updateNhomhoc] Updated group ID=${id}`);
    return res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    console.error("[updateNhomhoc] Error:", err);
    return res.status(500).send("Lỗi khi cập nhật nhóm học");
  }
};

/**
 * Xóa nhóm học
 */
const deleteNhomhoc = async (req, res) => {
  const { id } = req.params;
  console.log(`[deleteNhomhoc] Deleting group ID=${id}`);

  if (!Number.isInteger(Number(id))) {
    console.warn(`[deleteNhomhoc] Invalid ID parameter: ${id}`);
    return res.status(400).send("ID nhóm học không hợp lệ");
  }

  try {
    const sql = `DELETE FROM nhomhoc WHERE id_nhom_hoc = ?`;
    const result = await query(sql, [id]);
    if (result.affectedRows === 0) {
      console.info(`[deleteNhomhoc] No group found to delete for ID=${id}`);
      return res.status(404).send("Không tìm thấy nhóm học");
    }
    console.log(`[deleteNhomhoc] Deleted group ID=${id}`);
    return res.json({ message: "Xóa thành công" });
  } catch (err) {
    console.error("[deleteNhomhoc] Error:", err);
    return res.status(500).send("Lỗi khi xóa nhóm học");
  }
};

module.exports = {
  getAllNhomhoc,
  getNhomhocById,
  getNhomhocByIdLop,
  addNhomhoc,
  updateNhomhoc,
  deleteNhomhoc,
};