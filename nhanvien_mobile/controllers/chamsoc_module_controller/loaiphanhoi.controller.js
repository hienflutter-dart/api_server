// controllers/chamsoc_module_controller/loaiphanhoi.controller.js
const { query } = require('../../../config/db');

/** Lấy tất cả loại phản hồi */
const getLoaiPhanHoi = async (_req, res) => {
  console.log("[getLoaiPhanHoi] Fetching all feedback types");
  try {
    const rows = await query("SELECT * FROM loaiphanhoi ORDER BY id_loai_phan_hoi ASC");
    return res.json(rows);
  } catch (err) {
    console.error("[getLoaiPhanHoi] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn loại phản hồi");
  }
};

module.exports = { getLoaiPhanHoi };
