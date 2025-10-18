const { query } = require('../../../config/db');

const getLatestCandoByTreEm = async (req, res) => {
  try {
    const { id_tre_em } = req.params;

    if (!id_tre_em || isNaN(id_tre_em)) {
      return res.status(400).json({ message: "Thiếu hoặc sai id_tre_em" });
    }

    const sql = `
      SELECT c.*
      FROM cando c
      WHERE c.id_tre_em = ?
      ORDER BY c.ngay_thuc_hien DESC, c.id_can_do DESC
    `;

    const rows = await query(sql, [id_tre_em]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không có dữ liệu cân đo cho trẻ này" });
    }

    return res.json(rows);
  } catch (err) {
    console.error("[getLatestCandoByTreEm] Error:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

const getLatestAndPreviousByTreEm = async (req, res) => {
    try {
      const { id_tre_em } = req.params;
      if (!id_tre_em || isNaN(id_tre_em)) {
        return res.status(400).json({ message: "Thiếu hoặc sai id_tre_em" });
      }
  
      // Lấy 2 bản ghi mới nhất (ưu tiên ngày, rồi tới id_can_do đề phòng cùng ngày)
      const sql = `
        SELECT *
        FROM cando
        WHERE id_tre_em = ?
        ORDER BY ngay_thuc_hien DESC, id_can_do DESC
        LIMIT 2
      `;
      const rows = await query(sql, [id_tre_em]);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: "Không có dữ liệu cân đo cho trẻ này" });
      }
  
      const latest   = rows[0] || null;      // mới nhất
      const previous = rows[1] || null;      // lần trước đó (nếu có)
  
      return res.json({ latest, previous });
    } catch (err) {
      console.error("[getLatestAndPreviousByTreEm] Error:", err);
      return res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  };
  

  
module.exports = {
  getLatestCandoByTreEm,
  getLatestAndPreviousByTreEm
};
