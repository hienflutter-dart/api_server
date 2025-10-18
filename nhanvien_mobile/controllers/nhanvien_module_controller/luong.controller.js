const { query } = require('../../../config/db');

exports.getLuongByIdNV = async (req, res) => {
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

        COALESCE(agg.total_items, 0)        AS total_items,
        COALESCE(agg.total_thanh_tien, 0)   AS total_thanh_tien,
        -- ⚠️ KHÔNG CỘNG DỒN: lấy 1 giá trị đại diện của kỳ
        COALESCE(agg.so_ngay_vang_ky, 0)    AS total_so_ngay_vang,

        l.id_luong,
        l.id_nv,
        l.ten_nv,
        l.gioi_tinh,
        DATE(l.ngay_sinh) AS ngay_sinh,
        l.dia_chi,
        l.so_dien_thoai,
        DATE(l.ngay_vao_lam) AS ngay_vao_lam,
        l.phan_loai,
        l.trinh_do,
        l.id_kpi,
        l.ten_kpi,
        l.don_vi_cb,
        l.he_so_thuc,
        l.thanh_tien,
        l.ghi_chu_luong,
        l.so_ngay_vang

      FROM indexcount ic
      LEFT JOIN (
        SELECT 
          id_index, id_nv,
          COUNT(*) AS total_items,
          SUM(COALESCE(thanh_tien, 0))  AS total_thanh_tien,
          -- ✅ mỗi row đã là tổng ngày vắng của kỳ → lấy MAX/MIN đều như nhau
          MAX(COALESCE(so_ngay_vang, 0)) AS so_ngay_vang_ky
        FROM luong
        WHERE id_nv = ?
        GROUP BY id_index, id_nv
      ) AS agg
        ON agg.id_index = ic.id_index AND agg.id_nv = ?
      LEFT JOIN luong l
        ON l.id_index = ic.id_index AND l.id_nv = ?
      ORDER BY ic.ngay_bat_dau DESC, ic.id_index DESC, l.id_luong DESC;
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

          // Tổng hợp cho UI (không đổi tên field để tương thích frontend)
          total_items: Number(r.total_items) || 0,
          total_thanh_tien: Number(r.total_thanh_tien) || 0,
          total_so_ngay_vang: Number(r.total_so_ngay_vang) || 0, // ← giờ là MAX, không phải SUM

          // Danh sách item lương theo kỳ
          luong: [],
        });
      }

      if (r.id_luong != null) {
        grouped.get(r.id_index).luong.push({
          id_luong: r.id_luong,
          id_nv: r.id_nv,

          // Thông tin nhân sự (tiện render header)
          ten_nv: r.ten_nv,
          gioi_tinh: r.gioi_tinh,
          ngay_sinh: r.ngay_sinh,
          dia_chi: r.dia_chi,
          so_dien_thoai: r.so_dien_thoai,
          ngay_vao_lam: r.ngay_vao_lam,
          phan_loai: r.phan_loai,
          trinh_do: r.trinh_do,

          // KPI / tiền lương
          id_kpi: r.id_kpi,
          ten_kpi: r.ten_kpi,
          don_vi_cb: Number(r.don_vi_cb) || 0,
          he_so_thuc: Number(r.he_so_thuc) || 0,
          thanh_tien: Number(r.thanh_tien) || 0,
          ghi_chu_luong: r.ghi_chu_luong,

          // Dù mỗi row đã là tổng của kỳ, vẫn trả về để không phá vỡ UI item-level
          so_ngay_vang: Number(r.so_ngay_vang) || 0,
        });
      }
    }

    const result = Array.from(grouped.values());

    const grand_total_thanh_tien = result.reduce(
      (sum, p) => sum + (Number(p.total_thanh_tien) || 0),
      0
    );

    console.log("Fetched Lương for id_nv:", id_nv, "periods:", result.length);

    return res.status(200).json({
      ok: true,
      id_nv,
      total_periods: result.length,
      grand_total_thanh_tien,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching Lương by id_nv:", err);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
};