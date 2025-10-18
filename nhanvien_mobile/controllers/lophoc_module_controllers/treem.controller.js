const { query } = require("../../../config/db");


// Lấy danh sách trẻ theo id_nhom_hoc
const getTreEmByNhom = async (req, res) => {
  const { id_nhom_hoc } = req.params;
  if (!Number.isInteger(Number(id_nhom_hoc))) {
    return res.status(400).json({ ok: false, message: "ID nhóm không hợp lệ" });
  }
  try {
    const sql = `
      SELECT t.id_tre_em, t.ten_day_du, t.ten_thuong_goi, t.gioi_tinh,
             t.ngay_sinh, t.trang_thai
      FROM xeplophoc x
      JOIN treem t ON x.id_tre_em = t.id_tre_em
      WHERE x.id_nhom_hoc = ? AND x.val=1
    `;
    const rows = await query(sql, [id_nhom_hoc]);
    console.log('[getTreEmByNhom] idnhom:', [id_nhom_hoc]);
    return res.json({ ok: true, items: rows });
  } catch (err) {
    console.error("[getTreEmByNhom] error:", err);
    return res.status(500).json({ ok: false, message: "Lỗi server" });
  }
};

// Lấy thông tin 1 trẻ kèm ảnh (nếu có)
const getTreEmDetail = async (req, res) => {
  const { id_tre_em } = req.params;
  // console.log('[getTreEmDetail] id_tre_em:', id_tre_em);
  if (!Number.isInteger(Number(id_tre_em))) {
    return res.status(400).json({ ok: false, message: "ID trẻ không hợp lệ" });
  }
  try {
    // Lấy thông tin trẻ
    const [treem] = await query("SELECT * FROM treem WHERE id_tre_em=?", [id_tre_em]);
    if (!treem) {
      return res.status(404).json({ ok: false, message: "Không tìm thấy trẻ" });
    }

    // Lấy hình ảnh (nếu có)
    const [imgRow] = await query("SELECT * FROM treem_images WHERE id_tre_em=?", [id_tre_em]);
    let images = null;
    if (imgRow) {
      images = {
        img_1: imgRow.img_1 ? Buffer.from(imgRow.img_1).toString("base64") : null,
        img_2: imgRow.img_2 ? Buffer.from(imgRow.img_2).toString("base64") : null,
        img_3: imgRow.img_3 ? Buffer.from(imgRow.img_3).toString("base64") : null,
        img_4: imgRow.img_4 ? Buffer.from(imgRow.img_4).toString("base64") : null,
        ghi_chu: imgRow.ghi_chu || null,
      };
    }
    // console.log("tre em info:",treem, images);
    return res.json({ ok: true, info: treem, images });

  } catch (err) {
    console.error("[getTreEmDetail] error:", err);
    return res.status(500).json({ ok: false, message: "Lỗi server" });
  }
};



const getTreemInfo = async (req, res) => {
   const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ ok: false, message: "ID trẻ không hợp lệ" });
  }
  try {
    // Lấy thông tin trẻ
    const [treem] = await query("SELECT * FROM treem WHERE id_tre_em=?", [id]);
    if (!treem) {
      return res.status(404).json({ ok: false, message: "Không tìm thấy trẻ" });
    }
    return res.json({ ok: true, info: treem});

  } catch (err) {
    console.error("[getTreEmInfo] error:", err);
    return res.status(500).json({ ok: false, message: "Lỗi server" });
  }
}

// GET /treem/:id_tre_em/images
const getTreEmImages = async (req, res) => {
  const { id_tre_em } = req.params;

  if (!/^\d+$/.test(String(id_tre_em))) {
    return res.status(400).json({ ok: false, message: "ID trẻ không hợp lệ" });
  }

  try {
    // Nếu mỗi trẻ có thể có nhiều dòng -> ưu tiên dòng mới nhất theo id_img
    const rows = await query(`
      SELECT img_1, img_2, img_3, img_4, ghi_chu
      FROM treem_images
      WHERE id_tre_em = ?
      ORDER BY id_img DESC
      LIMIT 1
    `, [id_tre_em]);

    const imgRow = rows[0];
    if (!imgRow) {
      return res.json({ ok: true, images: null });
    }

    const toB64 = (bin) => {
      if (!bin) return null;
      if (Buffer.isBuffer(bin)) return bin.toString('base64');
      if (ArrayBuffer.isView(bin)) {
        return Buffer
          .from(bin.buffer, bin.byteOffset, bin.byteLength)
          .toString('base64');
      }
      return Buffer.from(bin).toString('base64');
    };

    const images = {
      img_1: toB64(imgRow.img_1),
      img_2: toB64(imgRow.img_2),
      img_3: toB64(imgRow.img_3),
      img_4: toB64(imgRow.img_4),
      ghi_chu: imgRow.ghi_chu || null,
    };

    return res.json({ ok: true, images });
  } catch (err) {
    console.error("[getTreEmImages] error:", err);
    return res.status(500).json({ ok: false, message: "Lỗi server" });
  }
};




module.exports = {
  getTreEmByNhom,
  getTreEmDetail,
  getTreemInfo,
  getTreEmImages,
};
