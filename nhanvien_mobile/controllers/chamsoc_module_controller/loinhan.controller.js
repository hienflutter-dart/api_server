// controllers/module_chamsoc_controller/loinhan.controller.js
const { query }  = require('../../../config/db');

/**
 * Lấy tất cả lời nhắn
 */
const getLoiNhan = async (req, res) => {
  console.log("[getLoiNhan] Fetching all messages");
  try {
    const sql = `SELECT * FROM loinhan`;
    const rows = await query(sql);
    if (rows.length === 0) {
      console.info("[getLoiNhan] No messages found");
      return res.status(404).send("Không có lời nhắn nào");
    }
    return res.json(rows);
  } catch (err) {
    console.error("[getLoiNhan] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn lời nhắn");
  }
};

/**
 * Lấy lời nhắn theo ID
 */
const getLoiNhanById = async (req, res) => {
  const { id } = req.params;
  console.log(`[getLoiNhanById] Fetching ID=${id}`);
  if (!Number.isInteger(Number(id))) {
    return res.status(400).send("ID lời nhắn không hợp lệ");
  }
  try {
    const sql = `SELECT * FROM loinhan WHERE id_loi_nhan = ?`;
    const rows = await query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).send("Không tìm thấy lời nhắn");
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("[getLoiNhanById] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn lời nhắn");
  }
};

/**
 * Lấy tất cả lời nhắn theo ID trẻ em
 */
const getLoiNhanByTreEm = async (req, res) => {
  const { id_tre_em } = req.params;
  console.log(`[getLoiNhanByTreEm] Fetching messages for child ID=${id_tre_em}`);

  if (!Number.isInteger(Number(id_tre_em))) {
    console.warn(`[getLoiNhanByTreEm] Invalid child ID: ${id_tre_em}`);
    return res.status(400).send("ID trẻ em không hợp lệ");
  }

  try {
    const sql = `SELECT * FROM loinhan WHERE id_tre_em = ?`;
    const rows = await query(sql, [id_tre_em]);
    if (rows.length === 0) {
      console.info(`[getLoiNhanByTreEm] No messages for child ID=${id_tre_em}`);
      return res.status(404).send("Không có lời nhắn cho trẻ em này");
    }
    console.log(`[getLoiNhanByTreEm] Retrieved ${rows.length} records`);
    return res.json(rows);
  } catch (err) {
    console.error("[getLoiNhanByTreEm] Error fetching by child:", err);
    return res.status(500).send("Lỗi khi truy vấn lời nhắn");
  }
};

/**
 * Thêm mới lời nhắn
 */
const insertLoiNhan = async (req, res) => {
  console.log("[insertLoiNhan] Creating message:", req.body);
  try {
    const { noi_dung, id_tre_em, id_lop, trang_thai } = req.body;

    // Trường bắt buộc: nội dung
    if (!noi_dung) {
      console.warn("[insertLoiNhan] Missing noi_dung");
      return res.status(400).send("Thiếu trường bắt buộc: noi_dung");
    }

    // Validate khóa ngoại
    if (id_tre_em) {
      const chkTre = await query(
        `SELECT 1 FROM treem WHERE id_tre_em = ?`,
        [id_tre_em]
      );
      if (chkTre.length === 0) {
        console.warn(`[insertLoiNhan] Invalid child ID: ${id_tre_em}`);
        return res.status(400).send("ID trẻ em không tồn tại");
      }
    }
    if (id_lop) {
      const chkLop = await query(
        `SELECT 1 FROM lophoc WHERE id_lop = ?`,
        [id_lop]
      );
      if (chkLop.length === 0) {
        console.warn(`[insertLoiNhan] Invalid class ID: ${id_lop}`);
        return res.status(400).send("ID lớp không tồn tại");
      }
    }

    const sql = `
      INSERT INTO loinhan (
        id_loi_nhan, noi_dung, id_tre_em, id_lop, trang_thai
      ) VALUES (NULL, ?, ?, ?, ?)
    `;
    const params = [
      noi_dung,
      id_tre_em || null,
      id_lop || null,
      trang_thai != null ? trang_thai : 0
    ];
    const result = await query(sql, params);
    console.log(`[insertLoiNhan] Inserted with ID=${result.insertId}`);
    return res.status(201).json({ id_loi_nhan: result.insertId });
  } catch (err) {
    console.error("[insertLoiNhan] Error inserting message:", err);
    return res.status(500).send("Lỗi khi thêm lời nhắn");
  }
};

/**
 * Cập nhật lời nhắn
 */
const updateLoiNhan = async (req, res) => {
  const { id } = req.params;
  console.log(`[updateLoiNhan] Updating message ID=${id}`, req.body);

  if (!Number.isInteger(Number(id))) {
    console.warn(`[updateLoiNhan] Invalid ID parameter: ${id}`);
    return res.status(400).send("ID lời nhắn không hợp lệ");
  }

  try {
    const { noi_dung, id_tre_em, id_lop, trang_thai } = req.body;

    if (!noi_dung) {
      console.warn("[updateLoiNhan] Missing noi_dung");
      return res.status(400).send("Thiếu trường bắt buộc: noi_dung");
    }

    // Validate khóa ngoại
    if (id_tre_em) {
      const chkTre = await query(
        `SELECT 1 FROM treem WHERE id_tre_em = ?`,
        [id_tre_em]
      );
      if (chkTre.length === 0) {
        console.warn(`[updateLoiNhan] Invalid child ID: ${id_tre_em}`);
        return res.status(400).send("ID trẻ em không tồn tại");
      }
    }
    if (id_lop) {
      const chkLop = await query(
        `SELECT 1 FROM lophoc WHERE id_lop = ?`,
        [id_lop]
      );
      if (chkLop.length === 0) {
        console.warn(`[updateLoiNhan] Invalid class ID: ${id_lop}`);
        return res.status(400).send("ID lớp không tồn tại");
      }
    }

    const sql = `
      UPDATE loinhan SET
        noi_dung = ?, id_tre_em = ?, id_lop = ?, trang_thai = ?
      WHERE id_loi_nhan = ?
    `;
    const params = [
      noi_dung,
      id_tre_em || null,
      id_lop || null,
      trang_thai != null ? trang_thai : 0,
      id
    ];
    const result = await query(sql, params);
    if (result.affectedRows === 0) {
      console.info(`[updateLoiNhan] No message found for ID=${id}`);
      return res.status(404).send("Không tìm thấy lời nhắn");
    }
    console.log(`[updateLoiNhan] Updated ID=${id}`);
    return res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    console.error("[updateLoiNhan] Error updating message:", err);
    return res.status(500).send("Lỗi khi cập nhật lời nhắn");
  }
};

/**
 * Xóa lời nhắn
 */
const deleteLoiNhan = async (req, res) => {
  const { id } = req.params;
  console.log(`[deleteLoiNhan] Deleting message ID=${id}`);

  if (!Number.isInteger(Number(id))) {
    console.warn(`[deleteLoiNhan] Invalid ID parameter: ${id}`);
    return res.status(400).send("ID lời nhắn không hợp lệ");
  }

  try {
    const sql = `DELETE FROM loinhan WHERE id_loi_nhan = ?`;
    const result = await query(sql, [id]);
    if (result.affectedRows === 0) {
      console.info(`[deleteLoiNhan] No message found for ID=${id}`);
      return res.status(404).send("Không tìm thấy lời nhắn");
    }
    console.log(`[deleteLoiNhan] Deleted ID=${id}`);
    return res.json({ message: "Xóa thành công" });
  } catch (err) {
    console.error("[deleteLoiNhan] Error deleting message:", err);
    return res.status(500).send("Lỗi khi xóa lời nhắn");
  }
};


// số slot trống tối thiểu muốn thêm
const BATCH_SIZE = 10;

const khoitaoLoiNhan = async (req, res) => {
  try {
    const { id_tre_em, id_lop } = req.body;
    if (!id_tre_em || !id_lop) {
      console.warn("[ensureBatchForChild] Missing id_tre_em or id_lop");
      return res.status(400).json({ message: "Missing id_tre_em or id_lop" });
    }

    const [{ cnt }] = await query(
      "SELECT COUNT(*) AS cnt FROM loinhan WHERE id_tre_em=? AND trang_thai=0",
      [id_tre_em]
    );

    let added = 0;
    if (cnt === 0) {
      // không có slot trống → tạo lô mới
      console.log(`[ensureBatchForChild] No empty slots for child ID=${id_tre_em}, adding ${BATCH_SIZE} slots`);
      const values = Array.from(
        { length: BATCH_SIZE },
        () => [null, null, id_tre_em, id_lop, 0]
      );
      await query(
        "INSERT INTO loinhan (noi_dung, ngay_gui, id_tre_em, id_lop, trang_thai) VALUES ?",
        [values]
      );
      added = BATCH_SIZE;
    }
    console.log('đã kiểm tra và thêm lô lời nhắn nếu cần:', { cnt, added });
    res.json({ ok: true, existingEmpty: cnt, added });
  } catch (e) {
    console.error("[ensureBatchForChild] error", e);
    res.status(500).json({ message: "Server error" });
  }
};


const guiLoiNhan = async (req, res) => {
  try {
    const { id_tre_em, id_lop, noi_dung } = req.body;
    if (!id_tre_em || !id_lop || !noi_dung) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // lấy 1 slot trống
    let rows = await query(
      "SELECT id_loi_nhan FROM loinhan WHERE id_tre_em=? AND trang_thai=0 ORDER BY id_loi_nhan ASC LIMIT 1",
      [id_tre_em]
    );

    if (!rows.length) {
      console.log(`[sendMessageUsingSlot] No empty slots for child ID=${id_tre_em}, adding batch`);
      // hết sạch -> bơm thêm 10 rồi lấy lại
      const values = Array.from({ length: BATCH_SIZE }, () => [null, null, id_tre_em, id_lop, 0]);
      await query("INSERT INTO loinhan (noi_dung, ngay_gui, id_tre_em, id_lop, trang_thai) VALUES ?", [values]);

      rows = await query(
        "SELECT id_loi_nhan FROM loinhan WHERE id_tre_em=? AND trang_thai=0 ORDER BY id_loi_nhan ASC LIMIT 1",
        [id_tre_em]
      );
      if (!rows.length) return res.status(500).json({ message: "Cannot allocate slot" });
    }

    const id = rows[0].id_loi_nhan;

    await query(
      "UPDATE loinhan SET noi_dung=?, ngay_gui=NOW(), trang_thai=1, id_lop=? WHERE id_loi_nhan=?",
      [noi_dung, id_lop, id]
    );

    res.status(201).json({ ok: true, id_loi_nhan: id });
  } catch (e) {
    console.error("[sendMessageUsingSlot] error", e);
    res.status(500).json({ message: "Server error" });
  }
};


const getLoiNhanTodayByLop = async (req, res) => {
  try {
    const { id_lop } = req.params;
    const rows = await query(
      `SELECT * FROM loinhan 
       WHERE id_lop=? AND trang_thai=1 AND DATE(ngay_gui)=CURDATE()
       ORDER BY ngay_gui DESC`,
      [id_lop]
    );
    res.json(rows);
  } catch (e) {
    console.error("[getTodayMessagesByClass] error", e);
    res.status(500).json({ message: "Server error" });
  }
};



module.exports = {
  getLoiNhan,
  getLoiNhanById,
  getLoiNhanByTreEm,
  insertLoiNhan,
  updateLoiNhan,
  deleteLoiNhan,
  khoitaoLoiNhan,
  guiLoiNhan,
  getLoiNhanTodayByLop
};
