const { query } = require('../../../config/db');

// GET /lydo
const getLyDo = async (_req, res) => {
  try {
    const rows = await query(
      "SELECT id_ly_do, ten_ly_do, ma_mau FROM lydotheodoi ORDER BY id_ly_do ASC"
    );
    return res.json(rows);
  } catch (e) {
    console.error("[getLyDo] error", e);
    return res.status(500).send("Lỗi khi truy vấn lý do");
  }
};

// GET /lydo/:id
const getLyDoById = async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) return res.status(400).send("ID không hợp lệ");
  try {
    const rows = await query(
      "SELECT id_ly_do, ten_ly_do, ma_mau FROM lydotheodoi WHERE id_ly_do=?",
      [id]
    );
    if (!rows.length) return res.status(404).send("Không tìm thấy");
    return res.json(rows[0]);
  } catch (e) {
    console.error("[getLyDoById] error", e);
    return res.status(500).send("Lỗi khi truy vấn lý do");
  }
};

module.exports = { getLyDo, getLyDoById };
