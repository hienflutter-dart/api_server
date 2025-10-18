// controllers/lophoc_module_controllers/lophoc_overview.controller.js
const { query } = require('../../../config/db');

const getLopOverview = async (req, res) => {
  const idLop = Number(req.params.id);
  if (!Number.isInteger(idLop)) {
    return res.status(400).json({ message: "ID lớp không hợp lệ" });
  }

  try {
    // 1) Thông tin lớp
    const [lop] = await query(
      "SELECT id_lop, ten_lop, ghi_chu, rtsp FROM lophoc WHERE id_lop = ?",
      [idLop]
    );
    if (!lop) return res.status(404).json({ message: "Không tìm thấy lớp" });

    // 2) Danh sách nhóm + giáo viên phụ trách (đang hiệu lực)
    const groups = await query(
      `
      SELECT
        nh.id_nhom_hoc, nh.ten_nhom_hoc, nh.ghi_chu, nh.id_lop,
        nv.id_nv, nv.ho_ten
      FROM nhomhoc nh
      LEFT JOIN phancong pc
        ON pc.id_nhom_hoc = nh.id_nhom_hoc AND pc.val = 1
      LEFT JOIN nhanvien nv
        ON nv.id_nv = pc.id_nv
      WHERE nh.id_lop = ?
      ORDER BY nh.id_nhom_hoc
      `,
      [idLop]
    );

    // 3) Trẻ của các nhóm (đang hiệu lực)
    const groupIds = groups.map(g => g.id_nhom_hoc);
    let childrenRows = [];
    if (groupIds.length) {
      const placeholders = groupIds.map(() => "?").join(",");
      childrenRows = await query(
        `
        SELECT x.id_nhom_hoc, t.id_tre_em, t.ten_day_du, t.ten_thuong_goi
        FROM xeplophoc x
        JOIN treem t ON t.id_tre_em = x.id_tre_em
        WHERE x.val = 1 AND x.id_nhom_hoc IN (${placeholders})
        ORDER BY t.ten_day_du
        `,
        groupIds
      );
    }

    // 4) Gộp dữ liệu nhóm → trẻ
    const byGroup = new Map();
    for (const g of groups) {
      byGroup.set(g.id_nhom_hoc, {
        id_nhom_hoc: g.id_nhom_hoc,
        ten_nhom_hoc: g.ten_nhom_hoc,
        giao_vien: g.id_nv ? { id_nv: g.id_nv, ho_ten: g.ho_ten } : null,
        so_tre: 0,
        tre: [],
      });
    }
    for (const r of childrenRows) {
      const bucket = byGroup.get(r.id_nhom_hoc);
      if (!bucket) continue;
      bucket.tre.push({
        id_tre_em: r.id_tre_em,
        ten_day_du: r.ten_day_du,
        ten_thuong_goi: r.ten_thuong_goi,
      });
      bucket.so_tre++;
    }

    return res.json({
      id_lop: lop.id_lop,
      ten_lop: lop.ten_lop,
      ghi_chu: lop.ghi_chu,
      rtsp: lop.rtsp,
      nhoms: Array.from(byGroup.values()),
    });
  } catch (err) {
    console.error("[getLopOverview] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = { getLopOverview };
