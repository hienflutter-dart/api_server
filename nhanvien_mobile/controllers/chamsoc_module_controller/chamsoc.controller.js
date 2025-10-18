// controllers/chamsoc_module_controller/chamsoc.controller.js
const { query } = require('../../../config/db');
const { getBusinessDate, isValidYMD } = require("../../../config/helper/timehelper");
const { getIndexForDate } = require("../../../config/helper/indexcounthelper");

// ============= helpers chung =============
function getBizDateFromReq(req) {
  const qd = req.query?.date;
  if (qd && isValidYMD(qd)) return qd;        // 'YYYY-MM-DD'
  return getBusinessDate(new Date());         // rule 04:00
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

// Core: lấy danh sách chăm sóc cho 1 GV theo ngày nghiệp vụ
async function _listByStaffCore({ idNv, dateStr }) {
  const idNhom = await getManagedGroupId(idNv);
  const bizDate = dateStr || getBusinessDate(new Date());

  if (!idNhom) {
    return {
      business_date: bizDate,
      id_index: null,
      id_nhom_hoc: null,
      initialized: false,
      total: 0,
      records: []
    };
  }

  const idx = await getIndexForDate(bizDate);
  if (!idx) {
    const err = new Error("NO_INDEX_FOR_DATE");
    err.meta = { business_date: bizDate };
    throw err;
  }
  const idIndex = idx.id_index;

  const rows = await query(
    `SELECT cs.*, nh.ten_nhom_hoc
       FROM chamsoc cs
       LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = cs.id_nhom_hoc
      WHERE cs.id_nhom_hoc=? AND cs.ngay_diem_danh=? AND cs.id_index=?
      ORDER BY cs.ten_day_du`,
    [idNhom, bizDate, idIndex]
  );

  return {
    business_date: bizDate,
    id_index: idIndex,
    id_nhom_hoc: idNhom,
    initialized: rows.length > 0,
    total: rows.length,
    records: rows
  };
}

// ============= 1) LIST HÔM NAY (GV) =============
const listTodayByStaff = async (req, res) => {
  try {
    const idNv = Number(req.params.id_nv);
    if (!Number.isInteger(idNv)) return res.status(400).json({ message: "Thiếu id_nv" });

    const out = await _listByStaffCore({ idNv, dateStr: getBizDateFromReq(req) });
    console.log(out);
    return res.json(out);
  } catch (err) {
    if (err.message === "NO_INDEX_FOR_DATE") {
      return res.status(409).json({ message: "Chưa có kỳ cho ngày này", ...err.meta });
    }
    console.error("[chamsoc.listTodayByStaff] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// ============= 1b) LIST THEO NGÀY TÙY CHỌN =============
const listByStaffOnDate = async (req, res) => {
  try {
    const idNv = Number(req.params.id_nv);
    if (!Number.isInteger(idNv)) return res.status(400).json({ message: "Thiếu id_nv" });
    const dateStr = getBizDateFromReq(req);

    const out = await _listByStaffCore({ idNv, dateStr });
    return res.json(out);
  } catch (err) {
    if (err.message === "NO_INDEX_FOR_DATE") {
      return res.status(409).json({ message: "Chưa có kỳ cho ngày này", ...err.meta });
    }
    console.error("[chamsoc.listByStaffOnDate] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

//4) Lấy lịch sử cảm xúc theo TRẺ (mặc định 30 bản ghi gần nhất) ---
const getCamXucByIdTre = async (req, res) => {
  try {
    const idTre = Number(req.params.id_tre_em);
    if (!Number.isInteger(idTre)) return res.status(400).json({ message: "ID trẻ không hợp lệ" });

    const limit = Math.max(1, Math.min(200, Number(req.query?.limit ?? 30)));
    const rows = await query(
      `SELECT id_cs, id_tre_em, ten_day_du, ten_thuong_goi,
              id_lop, id_nhom_hoc, id_index, id_nv, ngay_diem_danh,
              cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text
         FROM chamsoc
        WHERE id_tre_em=?
        ORDER BY ngay_diem_danh DESC, id_index DESC, id_cs DESC
        LIMIT ${limit}`,
      [idTre]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[chamsoc.getCamXucByIdTre] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// ============= 2) KHỞI TẠO PHIẾU HÔM NAY (GV) =============
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
    const lockKey = `init_cs_${bizDate}_nhom${idNhom}_idx${idIndex}`;

    const inserted = await runInitSafely(lockKey, async () => {
      // Tạo bản ghi mặc định cho tất cả trẻ trong nhóm (nếu chưa có cho ngày/index này)
      const sql = `
        INSERT INTO chamsoc (
          id_tre_em, ten_day_du, ten_thuong_goi,
          id_lop, id_nhom_hoc, id_index, id_nv,
          ngay_diem_danh, cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text
        )
        SELECT
          t.id_tre_em,
          COALESCE(t.ten_day_du,''), COALESCE(t.ten_thuong_goi,''),
          nh.id_lop, nh.id_nhom_hoc, ?, ?, ?,
          0, 0, 0, 0, NULL
        FROM xeplophoc x
        JOIN treem t    ON t.id_tre_em=x.id_tre_em
        JOIN nhomhoc nh ON nh.id_nhom_hoc=x.id_nhom_hoc
        WHERE x.val=1 AND nh.id_nhom_hoc=?
          AND NOT EXISTS (
            SELECT 1 FROM chamsoc c
             WHERE c.id_tre_em=t.id_tre_em
               AND c.id_nhom_hoc=nh.id_nhom_hoc
               AND c.ngay_diem_danh=?
               AND c.id_index=?
          )`;
      const r = await query(sql, [idIndex, idNv, bizDate, idNhom, bizDate, idIndex]);
      return r?.affectedRows ?? 0;
    });

    return res.json({
      ok: true,
      business_date: bizDate,
      id_index: idIndex,
      id_nhom_hoc: idNhom,
      inserted
    });
  } catch (err) {
    console.error("[chamsoc.initTodayByStaff] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// ============= 3) CẬP NHẬT 1 PHIẾU (GV) =============
// Body cho phép: cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text
const updateOneByStaff = async (req, res) => {
  try {
    const id = Number(req.params.id_cs);
    const idNv = Number(req.params.id_nv);
    if (!Number.isInteger(id) || !Number.isInteger(idNv))
      return res.status(400).json({ message: "Tham số không hợp lệ" });

    const [cur] = await query(
      `SELECT id_tre_em, id_nhom_hoc, id_index, ngay_diem_danh
         FROM chamsoc
        WHERE id_cs=?`,
      [id]
    );
    if (!cur) return res.status(404).json({ message: "Không tìm thấy phiếu" });

    // Chỉ GV đang quản lý nhóm này mới được sửa
    const [ok] = await query(
      `SELECT 1 FROM phancong WHERE id_nv=? AND id_nhom_hoc=? AND val=1 LIMIT 1`,
      [idNv, cur.id_nhom_hoc]
    );
    if (!ok) return res.status(403).json({ message: "Phiếu không thuộc nhóm bạn quản lý" });

    // Chuẩn hóa input
    let {
      cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text
    } = req.body || {};

    // Các trường cs_* là INT(1) – clamp 0..5 tuỳ thang của bạn (ở db bạn nói 1..5)
    function normScore(v) {
      if (v === undefined || v === null || v === '') return null;
      const n = Math.max(1, Math.min(5, Number(v)));
      return Number.isFinite(n) ? n : null;
    }
    cs_sang     = normScore(cs_sang);
    cs_chinh    = normScore(cs_chinh);
    cs_xe       = normScore(cs_xe);
    cs_cam_xuc  = normScore(cs_cam_xuc);
    cs_text     = (cs_text === undefined || cs_text === null) ? null : String(cs_text).trim();

    await query(
      `UPDATE chamsoc
          SET cs_sang=?,
              cs_chinh=?,
              cs_xe=?,
              cs_cam_xuc=?,
              cs_text=?,
              id_nv=?         -- người cập nhật
        WHERE id_cs=?`,
      [cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text, idNv, id]
    );

    return res.json({
      ok: true,
      id_cs: id,
      updated_by: idNv,
      payload: { cs_sang, cs_chinh, cs_xe, cs_cam_xuc, cs_text }
    });
  } catch (err) {
    console.error("[chamsoc.updateOneByStaff] error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  listTodayByStaff,
  listByStaffOnDate,
  initTodayByStaff,
  updateOneByStaff,
  getCamXucByIdTre,          // <— nhớ export
};
