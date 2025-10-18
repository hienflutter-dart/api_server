const { query, db } = require('../../../config/db');

exports.getAllCCNV = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM ccnv`);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching ccnv: ", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getCCNVById = async (req, res) => {
  const { id } = req.params;
  console.log("Fetching CCNV with id: ", id);
  try {
    const [rows] = await db.query(`SELECT * FROM ccnv WHERE id_ccnv = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "CCNV not found" });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.eror("Error fetching CCNV by id: ", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getALLCCNVByIdNV = async (req, res) => {
  const id_nv = Number(req.params.id_nv);
  if (!Number.isInteger(id_nv) || id_nv <= 0) {
    return res.status(400).json({ ok: false, message: "id_nv không hợp lệ" });
  }

  try {
    const rows = await query(
      `
      SELECT
        ic.id_index,
        ic.ten_index,
        DATE(ic.ngay_bat_dau)  AS ngay_bat_dau,
        DATE(ic.ngay_ket_thuc) AS ngay_ket_thuc,
        ic.so_ngay_hoat_dong,
        ic.ghi_chu,

        COALESCE(agg.attended_days, 0) AS attended_days,

        c.id_ccnv,
        c.id_nv,
        c.ho_ten,

        -- Dùng để nhóm/sort theo ngày
        DATE(c.ngay_cc_db) AS ngay_cc_db,

        -- Giữ nguyên full datetime để UI có thể fallback nếu muốn
        c.ngay_cc_db       AS ngay_cc_db_full,
        c.ngay_cc_cb       AS ngay_cc_cb_full,

        c.he_so_cc,
        c.cc_muon,

        -- Giờ thực tế để hiển thị
        -- Nếu DB đang lưu UTC, bật CONVERT_TZ(...,'+00:00','+07:00')
        TIME_FORMAT(/*CONVERT_TZ(*/c.ngay_cc_db/*,'+00:00','+07:00')*/, '%H:%i') AS gio_vao,
        TIME_FORMAT(/*CONVERT_TZ(*/c.ngay_cc_cb/*,'+00:00','+07:00')*/, '%H:%i') AS gio_ra

      FROM indexcount ic
      LEFT JOIN (
        SELECT id_index, id_nv,
              COUNT(DISTINCT DATE(ngay_cc_db)) AS attended_days
        FROM ccnv
        WHERE id_nv = ?
          AND (ngay_cc_cb IS NOT NULL OR he_so_cc > 0)
        GROUP BY id_index, id_nv
      ) AS agg
        ON agg.id_index = ic.id_index AND agg.id_nv = ?
      LEFT JOIN ccnv c
        ON c.id_index = ic.id_index AND c.id_nv = ?
      ORDER BY ic.ngay_bat_dau DESC, ic.id_index DESC, c.ngay_cc_db ASC, c.ngay_cc_cb ASC;
      `,
      [id_nv, id_nv, id_nv]
    );

    const grouped = new Map();
    for (const r of rows) {
      if (!grouped.has(r.id_index)) {
        grouped.set(r.id_index, {
          id_index: r.id_index,
          ten_index: r.ten_index,
          ngay_bat_dau: r.ngay_bat_dau,
          ngay_ket_thuc: r.ngay_ket_thuc,
          so_ngay_hoat_dong: r.so_ngay_hoat_dong,
          ghi_chu: r.ghi_chu,
          attended_days: Number(r.attended_days) || 0,
          cham_cong: [],
        });
      }

      if (r.id_ccnv != null) {
        const attended = Number(r.attended_days) || 0;
        const total = Number(r.so_ngay_hoat_dong) || 0;

        grouped.get(r.id_index).cham_cong.push({
          id_ccnv: r.id_ccnv,
          id_nv: r.id_nv,
          ho_ten: r.ho_ten,

          // Ngày để nhóm (date-only) như cũ
          ngay_cc_db: r.ngay_cc_db,

          // Checkout datetime (nếu bạn đang dùng ở nơi khác)
          ngay_cc_cb: r.ngay_cc_cb,

          // ✅ Giờ vào/ra để hiển thị ở màn chi tiết
          gio_vao: r.gio_vao, // "HH:mm" hoặc null
          gio_ra: r.gio_ra, // "HH:mm" hoặc null

          he_so_cc: r.he_so_cc ?? 0,
          cc_muon: r.cc_muon ?? 0,
          attended_days: attended,
          absent_days: Math.max(0, total - attended),
        });
      }
    }
    console.log("Grouped CCNV data: ", grouped.gio_ra);

    const result = Array.from(grouped.values());
    return res.status(200).json({
      ok: true,
      id_nv,
      total_periods: result.length,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching full CCNV with periods:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Internal server error" });
  }
};

exports.createCCNV = async (req, res) => {
  const data = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO ccnv (id_nv, ho_ten, ngay_cc_db, ngay_cc_cb, id_index, he_so_cc, cc_muon)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id_nv,
        data.ho_ten,
        data.ngay_cc_db,
        data.ngay_cc_cb,
        data.id_index,
        data.he_so_cc,
        data.cc_muon,
      ]
    );
    res
      .status(201)
      .json({ message: "CCNV created successfully", id: result.insertId });
  } catch (err) {
    console.error("Error creating CCNV: ", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateCCNV = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const rows = await updatePartial("ccnv", data, id, "id_ccnv");
    if (!rows) {
      return res.status(404).json({ message: "CCNV not found" });
    }
    res.status(200).json({ message: "CCNV updated successfully" });
  } catch (err) {
    console.error("Error updating CCNV: ", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteCCNV = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(`DELETE FROM ccnv WHERE id_ccnv = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "CCNV not found" });
    }
    res.status(200).json({ message: "CCNV deleted successfully" });
  } catch (err) {
    console.error("Error deleting CCNV: ", err);
    res.status(500).json({ message: "Internal server error" });
  }
};