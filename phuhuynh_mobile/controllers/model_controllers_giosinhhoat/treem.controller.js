const { query } = require('../../../config/db');
/**
 * Lấy tất cả trẻ em
 */
const getTreEm = async (req, res) => {
  console.log("[getTreEm] Fetching all children");
  try {
    const sql = `SELECT * FROM treem`;
    const rows = await query(sql);
    if (rows.length === 0) {
      console.info("[getTreEm] No children found");
      return res.status(404).send("Không có trẻ em nào");
    }
    console.log(`[getTreEm] Retrieved ${rows.length} records`);
    return res.json(rows);
  } catch (err) {
    console.error("[getTreEm] Error fetching children:", err);
    return res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};


/**
 * Lấy một trẻ theo ID
 */
const getTreEmById = async (req, res) => {
  const { id } = req.params;
  console.log(`[getTreEmById] Fetching child ID=${id}`);
  if (!Number.isInteger(Number(id))) {
    console.warn(`[getTreEmById] Invalid ID: ${id}`);
    return res.status(400).send("ID trẻ em không hợp lệ");
  }
  try {
    const sql = `SELECT * FROM treem WHERE id_tre_em = ?`;
    const rows = await query(sql, [id]);
    if (rows.length === 0) {
      console.info(`[getTreEmById] No child found for ID=${id}`);
      return res.status(404).send("Không tìm thấy trẻ em");
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("[getTreEmById] Error fetching child:", err);
    return res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};

/**
 * Lấy danh sách trẻ theo id_lop (JOIN bảng xeplophoc và treem)
 */
const getTreEmByIdLop = async (req, res) => {
  const { id_lop } = req.params;
  console.log(`[getTreEmByIdLop] Fetching children for class ID=${id_lop}`);
  if (!Number.isInteger(Number(id_lop))) {
    console.warn(`[getTreEmByIdLop] Invalid class ID: ${id_lop}`);
    return res.status(400).send("ID lớp học không hợp lệ");
  }
  try {
    const sql = `
      SELECT t.*
      FROM xeplophoc x
      JOIN treem t ON x.id_tre_em = t.id_tre_em
      JOIN nhomhoc n ON x.id_nhom_hoc = n.id_nhom_hoc
      WHERE n.id_lop = ?
    `;
    const rows = await query(sql, [id_lop]);
    if (rows.length === 0) {
      console.info(`[getTreEmByIdLop] No children found for class ID=${id_lop}`);
      return res.status(404).send("Không có trẻ nào trong lớp này");
    }
    console.log(`[getTreEmByIdLop] Retrieved ${rows.length} records`);
    return res.json(rows);
  } catch (err) {
    console.error("[getTreEmByIdLop] Error fetching children by class:", err);
    return res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};

const addTreEm = async (req, res) => {
  console.log("[insertTreEm] Creating a new child", req.body);
  try {
    const {
      ten_day_du,
      ten_thuong_goi,
      gioi_tinh,
      ngay_sinh,
      dia_chi,
      ten_cha,
      ten_me,
      so_dien_thoai_1,
      so_dien_thoai_2,
      ngay_nhap_hoc,
      trang_thai,
      ghi_chu,
      ma_dinh_danh,
      ten_tai_khoan,
      mat_khau,
      token,
      t_hp
    } = req.body;

    if (!ten_day_du || !so_dien_thoai_1) {
      console.warn("[insertTreEm] Missing required fields");
      return res.status(400).send("Thiếu các trường bắt buộc: ten_day_du, so_dien_thoai_1");
    }

    const sql = `INSERT INTO treem (
        ten_day_du, ten_thuong_goi, gioi_tinh, ngay_sinh, dia_chi,
        ten_cha, ten_me, so_dien_thoai_1, so_dien_thoai_2,
        ngay_nhap_hoc, trang_thai, ghi_chu, ma_dinh_danh,
        ten_tai_khoan, mat_khau, token, t_hp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      ten_day_du,
      ten_thuong_goi || null,
      gioi_tinh || null,
      ngay_sinh || null,
      dia_chi || null,
      ten_cha || null,
      ten_me || null,
      so_dien_thoai_1,
      so_dien_thoai_2 || null,
      ngay_nhap_hoc || null,
      trang_thai != null ? trang_thai : 1,
      ghi_chu || null,
      ma_dinh_danh || null,
      ten_tai_khoan || null,
      mat_khau || null,
      token || null,
      t_hp || null
    ];

    const result = await query(sql, params);
    console.log(`[insertTreEm] Inserted child with ID=${result.insertId}`);
    return res.status(201).json({ id_tre_em: result.insertId });
  } catch (err) {
    console.error("[insertTreEm] Error inserting child:", err);
    return res.status(500).send("Lỗi khi thêm trẻ em");
  }
};


const addTreemToLophoc = async (req, res) => {
  try {
    console.log('req.body =', req.body);

    const normalize = v => (v === '' || v === undefined) ? null : v;

    const allowedTreem = [
      'ten_day_du', 'ten_thuong_goi', 'gioi_tinh', 'ngay_sinh', 'dia_chi',
      'ten_cha', 'ten_me', 'so_dien_thoai_1', 'so_dien_thoai_2',
      'ngay_nhap_hoc', 'trang_thai', 'ghi_chu', 'ma_dinh_danh',
      'ten_tai_khoan', 'mat_khau', 'token', 't_hp'
    ];

    const insertTreem = {};
    for (const k of allowedTreem) {
      if (k === 'trang_thai') {
        insertTreem[k] = (req.body[k] !== undefined && req.body[k] !== '') ? req.body[k] : 3;
      } else {
        insertTreem[k] = normalize(req.body[k]);
      }
    }

    // 1) treem
    const treemResult = await query('INSERT INTO treem SET ?', insertTreem);
    const idTreEm = treemResult.insertId;

    // 2) lớp năng khiếu (tùy chọn)
    if (req.body.id_lop_nk) {
      const lopNKList = Array.isArray(req.body.id_lop_nk) ? req.body.id_lop_nk : [req.body.id_lop_nk];
      for (const idLopNK of lopNKList) {
        await query('INSERT INTO tc_xeplopnk SET ?', { id_tre_em: idTreEm, id_lop_nk: idLopNK });
      }
    }

    // 3) xếp lớp học (nhóm học)
    const ngayBatDau = insertTreem.ngay_nhap_hoc || new Date().toISOString().slice(0, 10);
    if (req.body.id_nhom_hoc) {
      const nhomHocList = Array.isArray(req.body.id_nhom_hoc) ? req.body.id_nhom_hoc : [req.body.id_nhom_hoc];
      for (const idNhomHoc of nhomHocList) {
        await query('INSERT INTO xeplophoc SET ?', {
          id_tre_em: idTreEm,
          id_nhom_hoc: idNhomHoc,
          ngay_bat_dau: ngayBatDau,
          val: 1,
        });
      }
    }

    // 4) giấy khai sinh -> treem_images
    // --- Cách 1: multipart (multer) ---
    const file1 = req.files?.img1?.[0]; // mặt trước
    const file4 = req.files?.img4?.[0]; // mặt sau

    // --- Cách 2: base64 trong body (nếu bạn không gửi file multipart) ---
    // field: img_1_b64, img_4_b64 -> "data:image/png;base64,...." hoặc chuỗi base64 thuần
    let b64_1 = req.body.img_1_b64;
    let b64_4 = req.body.img_4_b64;
    // LƯU CHUỖI base64 CÓ PREFIX vào BLOB
    const toUtf8Buf = (s) => {
      if (!s) return null;
      // Nếu đã có prefix thì giữ nguyên, nếu chưa có thì thêm vào
      if (!s.startsWith('data:image/jpeg;base64,')) {
        s = 'data:image/jpeg;base64,' + s;
      }
      return Buffer.from(s, 'utf8'); // Lưu text base64 (có prefix) vào blob
    };
    
    const img1Buf = toUtf8Buf(req.body.img_1);
    const img4Buf = toUtf8Buf(req.body.img_4);
    
    await query(
      `INSERT INTO treem_images (id_tre_em, img_1, img_4, ghi_chu)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         img_1 = VALUES(img_1),
         img_4 = VALUES(img_4),
         ghi_chu = VALUES(ghi_chu)`,
      [idTreEm, img1Buf, img4Buf, normalize(req.body.ghi_chu_img)]
    );
    

    res.json({
      message: "Thêm trẻ thành công (kèm giấy khai sinh nếu có)",
      id_tre_em: idTreEm,
    });

  } catch (err) {
    console.error('Lỗi create:', err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


const updateTreEm = async (req, res) => {
  const { id } = req.params;
  console.log(`[updateTreEm] Updating child ID=${id}`, req.body);

  if (!Number.isInteger(Number(id))) {
    console.warn(`[updateTreEm] Invalid ID parameter: ${id}`);
    return res.status(400).send("ID trẻ em không hợp lệ");
  }

  try {
    const {
      ten_day_du,
      ten_thuong_goi,
      gioi_tinh,
      ngay_sinh,
      dia_chi,
      ten_cha,
      ten_me,
      so_dien_thoai_1,
      so_dien_thoai_2,
      ngay_nhap_hoc,
      trang_thai,
      ghi_chu,
      ma_dinh_danh,
      ten_tai_khoan,
      mat_khau,
      token,
      t_hp
    } = req.body;

    const sql = `UPDATE treem SET
        ten_day_du = ?, ten_thuong_goi = ?, gioi_tinh = ?, ngay_sinh = ?, dia_chi = ?,
        ten_cha = ?, ten_me = ?, so_dien_thoai_1 = ?, so_dien_thoai_2 = ?,
        ngay_nhap_hoc = ?, trang_thai = ?, ghi_chu = ?, ma_dinh_danh = ?,
        ten_tai_khoan = ?, mat_khau = ?, token = ?, t_hp = ?
      WHERE id_tre_em = ?`;

    const params = [
      ten_day_du,
      ten_thuong_goi || null,
      gioi_tinh || null,
      ngay_sinh || null,
      dia_chi || null,
      ten_cha || null,
      ten_me || null,
      so_dien_thoai_1,
      so_dien_thoai_2 || null,
      ngay_nhap_hoc || null,
      trang_thai != null ? trang_thai : 1,
      ghi_chu || null,
      ma_dinh_danh || null,
      ten_tai_khoan || null,
      mat_khau || null,
      token || null,
      t_hp || null,
      id
    ];

    const result = await query(sql, params);
    if (result.affectedRows === 0) {
      console.info(`[updateTreEm] No child found to update for ID=${id}`);
      return res.status(404).send("Không tìm thấy trẻ em");
    }

    console.log(`[updateTreEm] Updated child ID=${id}`);
    return res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    console.error("[updateTreEm] Error updating child:", err);
    return res.status(500).send("Lỗi khi cập nhật trẻ em");
  }
};

const deleteTreEm = async (req, res) => {
  const { id } = req.params;
  console.log(`[deleteTreEm] Setting status=0 for child ID=${id}`);

  if (!Number.isInteger(Number(id))) {
    console.warn(`[deleteTreEm] Invalid ID parameter: ${id}`);
    return res.status(400).send("ID trẻ em không hợp lệ");
  }

  try {
    const sql = `UPDATE treem SET trang_thai = 0 WHERE id_tre_em = ?`;
    const result = await query(sql, [id]);

    if (result.affectedRows === 0) {
      console.info(`[deleteTreEm] No child found to update status for ID=${id}`);
      return res.status(404).send("Không tìm thấy trẻ em để cập nhật trạng thái");
    }

    console.log(`[deleteTreEm] Updated status=0 for child ID=${id}`);
    return res.json({ message: "Đã chuyển trạng thái trẻ em thành 0 (ngừng hoạt động)" });
  } catch (err) {
    console.error("[deleteTreEm] Error updating status:", err);
    return res.status(500).send("Lỗi khi cập nhật trạng thái trẻ em");
  }
};

function normalizeFromDb(v) {
  if (!v) return null;
  // nếu DB lưu BLOB -> Buffer => chuyển về string
  if (Buffer.isBuffer(v)) v = v.toString('utf8');
  v = String(v).trim();
  // nếu chưa có prefix thì mặc định là jpeg
  if (!v.startsWith('data:image/')) {
    v = 'data:image/jpeg;base64,' + v;
  }
  return v;
}

// GET /treem-images/:id?only=1|4
const getTreEmImages = async (req, res) => {
  try {
    const idTreEm = Number(req.params.id);
    if (!idTreEm) {
      return res.status(400).json({ ok: false, message: 'Thiếu id_tre_em' });
    }

    const rows = await query(
      'SELECT img_1 FROM treem_images WHERE id_tre_em = ? LIMIT 1',
      [idTreEm]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy ảnh' });
    }

    const row = rows[0];
    const img1 = normalizeFromDb(row.img_1);

    const only = (req.query.only || '').toString();
    if (only === '1') {
      return res.json({ ok: true, id_tre_em: idTreEm, img_1: img1 });
    }
   

    return res.json({
      ok: true,
      id_tre_em: idTreEm,
      img_1: img1
    });
  } catch (err) {
    console.error('[getTreEmImages] error:', err);
    res.status(500).json({ ok: false, message: 'Lỗi máy chủ' });
  }
};



module.exports = {
  getTreEm,
  getTreEmById,
  getTreEmByIdLop,
  addTreEm,
  addTreemToLophoc,
  updateTreEm,
  deleteTreEm,
  getTreEmImages
};