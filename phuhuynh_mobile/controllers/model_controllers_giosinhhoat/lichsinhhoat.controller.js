const { query } = require('../../../config/db');

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

async function getLichSinhHoatByLop(req, res) {
  try {
    const id_lop = toInt(req.params.id_lop);
    if (id_lop == null) return res.status(400).json({ error: 'id_lop không hợp lệ' });

    const sql = `
      SELECT DISTINCT
          lsh.id_lich_sinh_hoat,
          lsh.lsh_thu,
          lsh.lsh_ngay,
          gsh.gio_bat_dau,
          gsh.gio_ket_thuc,
          hd.ten_hoat_dong,
          hd.ky_hieu,

          /* id_sinh_hoat: đã lưu sẵn trong lsh (HT = id_bai_giang; AS/AT/TM/AC = id_td) */
          lsh.id_sinh_hoat,

          /* ===== BÀI GIẢNG (ưu tiên join theo id_sinh_hoat; nếu null thì fallback lấy theo phân bổ) ===== */
          COALESCE(bg_id.id_bai_giang, bg_pb.id_bai_giang)      AS id_bai_giang,
          COALESCE(bg_id.ten_bai_giang, bg_pb.ten_bai_giang)    AS ten_bai_giang,
          COALESCE(bg_id.tom_tat,      bg_pb.tom_tat)           AS tom_tat,
          COALESCE(cd_id.ten_chu_de,   cd_pb.ten_chu_de)        AS ten_chu_de,

          /* ===== MÓN ĂN: lấy từ thucdon đã join bằng id_sinh_hoat ===== */
          CASE
            WHEN hd.ky_hieu='AS' THEN td.td_ma_1
            WHEN hd.ky_hieu='AT' THEN td.td_ma_3
            WHEN hd.ky_hieu='TM' THEN td.td_ma_5
            WHEN hd.ky_hieu='AC' THEN td.td_ma_6
          END AS id_mon_1,

          CASE
            WHEN hd.ky_hieu='AS' THEN td.td_ma_2
            WHEN hd.ky_hieu='AT' THEN td.td_ma_4
            WHEN hd.ky_hieu='TM' THEN NULL
            WHEN hd.ky_hieu='AC' THEN td.td_ma_7
          END AS id_mon_2,

          CASE
            WHEN hd.ky_hieu='AS' THEN mn1.ten_mon
            WHEN hd.ky_hieu='AT' THEN mn3.ten_mon
            WHEN hd.ky_hieu='TM' THEN mn5.ten_mon
            WHEN hd.ky_hieu='AC' THEN mn6.ten_mon
          END AS ten_mon_1,

          CASE
            WHEN hd.ky_hieu='AS' THEN mn2.ten_mon
            WHEN hd.ky_hieu='AT' THEN mn4.ten_mon
            WHEN hd.ky_hieu='TM' THEN NULL
            WHEN hd.ky_hieu='AC' THEN mn7.ten_mon
          END AS ten_mon_2

      FROM lichsinhhoat lsh
      JOIN giosinhhoat gsh ON lsh.id_gio_sinh_hoat = gsh.id_gio_sinh_hoat
      JOIN hoatdong    hd  ON lsh.id_hoat_dong     = hd.id_hoat_dong

      /* ====== HT: JOIN bài giảng theo id_sinh_hoat ====== */
      LEFT JOIN baigiang bg_id
        ON hd.ky_hieu = 'HT'
       AND lsh.id_sinh_hoat IS NOT NULL
       AND bg_id.id_bai_giang = lsh.id_sinh_hoat
      LEFT JOIN chude cd_id ON cd_id.id_chu_de = bg_id.id_chu_de

      /* ====== Fallback (HT): nếu id_sinh_hoat NULL, lấy theo phân bổ lớp + NGÀY ====== */
      LEFT JOIN phanbo pb
        ON hd.ky_hieu = 'HT'
       AND lsh.id_sinh_hoat IS NULL
       AND pb.id_lop = lsh.id_lop
       AND DATE(lsh.lsh_ngay) BETWEEN pb.ngay_bat_dau AND COALESCE(pb.ngay_ket_thuc, '9999-12-31')
      LEFT JOIN baigiang bg_pb ON bg_pb.id_bai_giang = pb.id_bai_giang
      LEFT JOIN chude   cd_pb  ON cd_pb.id_chu_de    = bg_pb.id_chu_de

      /* ====== AS/AT/TM/AC: JOIN thucdon theo id_sinh_hoat (id_td) ====== */
      LEFT JOIN thucdon td
        ON hd.ky_hieu IN ('AS','AT','TM','AC')
       AND lsh.id_sinh_hoat IS NOT NULL
       AND td.id_td = lsh.id_sinh_hoat

      /* Nối các món ăn từ thucdon */
      LEFT JOIN monan mn1 ON mn1.id_ma = td.td_ma_1
      LEFT JOIN monan mn2 ON mn2.id_ma = td.td_ma_2
      LEFT JOIN monan mn3 ON mn3.id_ma = td.td_ma_3
      LEFT JOIN monan mn4 ON mn4.id_ma = td.td_ma_4
      LEFT JOIN monan mn5 ON mn5.id_ma = td.td_ma_5
      LEFT JOIN monan mn6 ON mn6.id_ma = td.td_ma_6
      LEFT JOIN monan mn7 ON mn7.id_ma = td.td_ma_7

      WHERE lsh.id_lop = ?
      ORDER BY lsh.lsh_ngay, gsh.gio_bat_dau
    `;

    const rows = await query(sql, [id_lop]);
    return res.json(rows);
  } catch (error) {
    console.error('getLichSinhHoatByLop error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { getLichSinhHoatByLop };
