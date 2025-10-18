// controllers/chamsoc_module_controller/diemdanh.controller.js
const { query } = require('../../../config/db');
const { getBusinessDate, isValidYMD } = require("../../../config/helper/timehelper"); // ← thêm isValidYMD đơn giản
const { getIndexForDate } = require("../../../config/helper/indexcounthelper");

// === helpers ===
function getBizDateFromReq(req) {
  const qd = req.query?.date;
  if (qd && isValidYMD(qd)) return qd;            // 'YYYY-MM-DD'
  return getBusinessDate(new Date());             // rule 04:00
}
async function getManagedGroupId(id_nv) {
  const r = await query(
    `SELECT p.id_nhom_hoc
       FROM phancong p
      WHERE p.id_nv=? AND p.val=1
      ORDER BY p.ngay_bat_dau DESC, p.id_pc DESC
      LIMIT 1`,
    [id_nv]
  );
  return r.length ? r[0].id_nhom_hoc : null;
}
async function runInitSafely(lockKey, fn) {
  const [g] = await query("SELECT GET_LOCK(?, 10) AS ok", [lockKey]);
  if (!g || g.ok !== 1) throw new Error("LOCK_FAILED");
  try { return await fn(); }
  finally { await query("SELECT RELEASE_LOCK(?)", [lockKey]).catch(() => {}); }
}

async function _listByStaffCore({ idNv, dateStr }) {
  const idNhom = await getManagedGroupId(idNv);
  const bizDate = dateStr || getBusinessDate(new Date());

  if (!idNhom) {
    return {
      business_date: bizDate, id_index: null, id_nhom_hoc: null,
      initialized: false, total: 0, records: []
    };
  }

  const idx = await getIndexForDate(bizDate);
  if (!idx) {
    const err = new Error("NO_INDEX_FOR_DATE");
    err.meta = { business_date: bizDate };
    throw err;
  }

  const idIndex = idx.id_index;
  const rows = await query(`
    SELECT dd.*, nh.ten_nhom_hoc
      FROM diemdanh dd
 LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = dd.id_nhom_hoc
     WHERE dd.id_nhom_hoc=? AND dd.ngay_diem_danh=? AND dd.id_index=?
  ORDER BY dd.ten_day_du
  `, [idNhom, bizDate, idIndex]);

  return {
    business_date: bizDate, id_index: idIndex, id_nhom_hoc: idNhom,
    initialized: rows.length > 0, total: rows.length, records: rows
  };
}

// === 1) Lấy danh sách phiếu HÔM NAY theo NHÂN VIÊN (giữ nguyên) ===
const listTodayByStaff = async (req, res) => {
  try {
    const idNv = Number(req.params.id_nv);
    if (!Number.isInteger(idNv)) return res.status(400).json({ message: "Thiếu id_nv" });

    const out = await _listByStaffCore({ idNv, dateStr: getBizDateFromReq(req) });
    return res.json(out);
  } catch (err) {
    if (err.message === "NO_INDEX_FOR_DATE") {
      return res.status(409).json({ message: "Chưa có kỳ cho ngày này", ...err.meta });
    }
    console.error("[listTodayByStaff] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// === 1b) Lấy theo NGÀY tuỳ chọn (query ?date=YYYY-MM-DD) ===
const listByStaffOnDate = async (req, res) => {
  try {
    const idNv = Number(req.params.id_nv);
    if (!Number.isInteger(idNv)) return res.status(400).json({ message: "Thiếu id_nv" });

    const dateStr = getBizDateFromReq(req); // đã validate
    const out = await _listByStaffCore({ idNv, dateStr });
    return res.json(out);
  } catch (err) {
    if (err.message === "NO_INDEX_FOR_DATE") {
      return res.status(409).json({ message: "Chưa có kỳ cho ngày này", ...err.meta });
    }
    console.error("[listByStaffOnDate] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// === 2) Khởi tạo phiếu hôm nay cho NHÂN VIÊN (giữ nguyên core) ===
const initTodayByStaff = async (req, res) => {
  try {
    const idNv = Number(req.params.id_nv);
    if (!Number.isInteger(idNv)) return res.status(400).json({ message: "Thiếu id_nv" });

    const idNhom = await getManagedGroupId(idNv);
    if (!idNhom) return res.json({ ok: true, inserted: 0, message: "NV chưa được phân công nhóm" });

    const bizDate = getBizDateFromReq(req);
    const idx = await getIndexForDate(bizDate);
    if (!idx) return res.status(409).json({ message: "Chưa có kỳ cho ngày này", business_date: bizDate });
    const idIndex = idx.id_index;

    const lockKey = `init_dd_${bizDate}_nhom${idNhom}_idx${idIndex}`;
    const inserted = await runInitSafely(lockKey, async () => {
      const sql = `
        INSERT INTO diemdanh (
          id_tre_em, ten_day_du, ten_thuong_goi,
          id_lop, id_nhom_hoc, id_index,
          id_nv, ngay_diem_danh,
          diem_danh, ly_do, req, co_phep, khong_phep
        )
        SELECT
          t.id_tre_em, COALESCE(t.ten_day_du,''), COALESCE(t.ten_thuong_goi,''),
          nh.id_lop, nh.id_nhom_hoc, ?, ?, ?,
          1, NULL, 0, 0, 0
        FROM xeplophoc x
        JOIN treem   t  ON t.id_tre_em=x.id_tre_em
        JOIN nhomhoc nh ON nh.id_nhom_hoc=x.id_nhom_hoc
       WHERE x.val=1 AND nh.id_nhom_hoc=?
         AND NOT EXISTS (
           SELECT 1 FROM diemdanh d
            WHERE d.id_tre_em=t.id_tre_em
              AND d.id_nhom_hoc=nh.id_nhom_hoc
              AND d.ngay_diem_danh=?
              AND d.id_index=?
         )
      `;
      const r = await query(sql, [idIndex, idNv, bizDate, idNhom, bizDate, idIndex]);
      return r?.affectedRows ?? 0;
    });

    return res.json({ ok: true, business_date: bizDate, id_index: idIndex, id_nhom_hoc: idNhom, inserted });
  } catch (err) {
    console.error("[initTodayByStaff] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// === 3) Cập nhật 1 phiếu (giữ nguyên, thêm check định dạng ly_do) ===
const updateOneByStaff = async (req, res) => {
  try {
    const id = Number(req.params.id_dem_danh);
    const idNv = Number(req.params.id_nv);
    if (!Number.isInteger(id) || !Number.isInteger(idNv))
      return res.status(400).json({ message: "Tham số không hợp lệ" });

    const [cur] = await query(`
      SELECT id_tre_em, id_nhom_hoc, id_index, ngay_diem_danh, diem_danh, ly_do
        FROM diemdanh WHERE id_dem_danh=?`, [id]);
    if (!cur) return res.status(404).json({ message: "Không tìm thấy phiếu" });

    const [ok] = await query(
      `SELECT 1 FROM phancong WHERE id_nv=? AND id_nhom_hoc=? AND val=1 LIMIT 1`,
      [idNv, cur.id_nhom_hoc]
    );
    if (!ok) return res.status(403).json({ message: "Phiếu không thuộc nhóm bạn quản lý" });

    let { ly_do } = req.body || {};
    if (ly_do !== undefined && ly_do !== null) {
      ly_do = String(ly_do).trim().toLowerCase();
      if (!['busy', 'sick', 'no', ''].includes(ly_do)) {
        return res.status(400).json({ message: "ly_do không hợp lệ" });
      }
      if (ly_do === '') ly_do = null;
    } else {
      ly_do = null;
    }

    const absent = (ly_do !== null);
    const diem_danh = absent ? 0 : 1;
    const co_phep = absent && (ly_do === 'busy' || ly_do === 'sick') ? 1 : 0;
    const khong_phep = absent && ly_do === 'no' ? 1 : 0;

    let newReq = 0;
    if (absent) {
      const [prev] = await query(`
        SELECT req FROM diemdanh
         WHERE id_tre_em=? AND id_index=? AND ngay_diem_danh < ?
      ORDER BY ngay_diem_danh DESC, id_dem_danh DESC
         LIMIT 1`,
        [cur.id_tre_em, cur.id_index, cur.ngay_diem_danh]
      );
      const prevReq = prev ? Number(prev.req) || 0 : 0;
      newReq = prevReq + 1;
    } else {
      newReq = 0;
    }

    await query(`
      UPDATE diemdanh
         SET diem_danh=?, ly_do=?, co_phep=?, khong_phep=?, id_nv=?, req=?
       WHERE id_dem_danh=?`,
      [diem_danh, ly_do, co_phep, khong_phep, idNv, newReq, id]
    );

    return res.json({ ok: true, id_dem_danh: id, absent, ly_do, req: newReq });
  } catch (err) {
    console.error("[updateOneByStaff] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  listTodayByStaff,
  listByStaffOnDate,  // ← mới
  initTodayByStaff,
  updateOneByStaff,
};
