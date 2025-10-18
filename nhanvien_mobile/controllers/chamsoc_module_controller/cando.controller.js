const { query } = require('../../../config/db');
const { getBusinessDate } = require('../../../config/helper/timehelper');

const TZ_H = 7; // Asia/Ho_Chi_Minh
const isYYYYMMDD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));
const toInt = (v) => (Number.isInteger(Number(v)) ? Number(v) : null);

/** Nhân viên đang quản lý nhóm nào (1 nhóm duy nhất) */
async function getManagedGroupId(id_nv) {
  const r = await query(
    `SELECT p.id_nhom_hoc
       FROM phancong p
      WHERE p.id_nv = ? AND p.val = 1
      ORDER BY p.ngay_bat_dau DESC, p.id_pc DESC
      LIMIT 1`,
    [id_nv]
  );
  if (!r.length) {
    const e = new Error("NO_GROUP_FOR_STAFF");
    e.status = 404;
    e.message = "Nhân viên chưa được phân công nhóm nào";
    throw e;
  }
  return r[0].id_nhom_hoc;
}

async function assertNhanVienQuanLyNhom() { return true; }

async function assertDateInsideIndex(id_index, dateYMD) {
  if (id_index == null || !isYYYYMMDD(dateYMD)) return;
  const r = await query(
    `SELECT 1 AS ok FROM indexcount
      WHERE id_index=? AND ? BETWEEN ngay_bat_dau AND ngay_ket_thuc
      LIMIT 1`,
    [id_index, dateYMD]
  );
  if (!r.length) {
    const e = new Error("DATE_OUTSIDE_INDEX");
    e.status = 409;
    e.message = "Ngày không thuộc kỳ được chọn";
    throw e;
  }
}

/* =========================
   READ (theo nhóm)
   ========================= */
async function listDatesByGroup(req, res) {
  try {
    const id_nhom_hoc = toInt(req.params.id_nhom_hoc);
    if (id_nhom_hoc == null) return res.status(400).send("Thiếu id_nhom_hoc");

    const id_index = toInt(req.query.id_index); // optional
    const month = req.query.month;              // 'YYYY-MM'
    let from = req.query.from;
    let to = req.query.to;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      from = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      to = `${month}-${String(last).padStart(2, '0')}`;
    }
    if (!from || !to) {
      const now = new Date();
      const y = now.getUTCFullYear(), m = now.getUTCMonth() + 1;
      from = `${y}-${String(m).padStart(2, '0')}-01`;
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    }

    const dateExpr = `DATE(ngay_thuc_hien + INTERVAL ${TZ_H} HOUR)`;
    const cond = [`id_nhom_hoc=?`, `${dateExpr} BETWEEN ? AND ?`];
    const params = [id_nhom_hoc, from, to];
    if (id_index != null) { cond.push(`id_index=?`); params.push(id_index); }

    const rows = await query(
      `SELECT DATE_FORMAT(ngay_thuc_hien,'%Y-%m-%d') AS ngay, COUNT(*) AS total
     FROM cando
    WHERE ${cond.join(' AND ')}
    GROUP BY DATE(ngay_thuc_hien)
    ORDER BY ngay DESC`,
      params
    );

    return res.json({
      ok: true,
      id_nhom_hoc, id_index, from, to,
      days: rows.map(r => ({ date: r.ngay, total: r.total })),
      total: rows.length,
    });
  } catch (err) {
    console.error("[listDatesByGroup] error:", err);
    return res.status(500).send("Lỗi khi lấy danh sách ngày của nhóm");
  }
}

async function listByGroupAtDate(req, res) {
  try {
    const id_nhom_hoc = toInt(req.params.id_nhom_hoc);
    const date = req.query.date;
    const id_index = toInt(req.query.id_index); // optional
    if (id_nhom_hoc == null) return res.status(400).send("Thiếu id_nhom_hoc");
    if (!isYYYYMMDD(date)) return res.status(400).send("Thiếu/ sai date YYYY-MM-DD");

    const dateExpr = `DATE(ngay_thuc_hien + INTERVAL ${TZ_H} HOUR)`;
    const cond = [`id_nhom_hoc=?`, `${dateExpr}=?`];
    const params = [id_nhom_hoc, date];
    if (id_index != null) { cond.push(`id_index=?`); params.push(id_index); }

    const rows = await query(
      `SELECT * FROM cando WHERE ${cond.join(' AND ')}
       ORDER BY ten_day_du, id_can_do`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error("[listByGroupAtDate] error:", err);
    return res.status(500).send("Lỗi khi truy vấn cân đo theo ngày");
  }
}

async function getCandoByTreEm(req, res) {
  const id = toInt(req.params.id_tre_em);
  if (id == null) return res.status(400).send("ID trẻ em không hợp lệ");
  try {
    const rows = await query(
      `SELECT * FROM cando WHERE id_tre_em=? ORDER BY ngay_thuc_hien DESC, id_can_do DESC`,
      [id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[getCandoByTreEm] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn cân đo");
  }
}

async function getCandoById(req, res) {
  const id = toInt(req.params.id);
  if (id == null) return res.status(400).send("ID cân đo không hợp lệ");
  try {
    const rows = await query(`SELECT * FROM cando WHERE id_can_do=?`, [id]);
    if (!rows.length) return res.status(404).send("Không tìm thấy cân đo");
    return res.json(rows[0]);
  } catch (err) {
    console.error("[getCandoById] Error:", err);
    return res.status(500).send("Lỗi khi truy vấn cân đo");
  }
}

/* =========================
   INIT (GROUP)
   ========================= */
async function initGroupHandler(req, res) {
  try {
    const id_nhom_hoc = toInt(req.params.id_nhom_hoc);
    const id_nv = toInt(req.body?.id_nv);
    const id_index = toInt(req.body?.id_index);
    let date = req.body?.date || req.body?.ngay;

    if (id_nhom_hoc == null) return res.status(400).send("Thiếu id_nhom_hoc");
    if (id_nv == null) return res.status(400).send("Thiếu id_nv");
    if (id_index == null) return res.status(400).send("Thiếu id_index");
    if (!isYYYYMMDD(date)) date = getBusinessDate(); // ✅ ngày nghiệp vụ VN

    await assertNhanVienQuanLyNhom(id_nv, id_nhom_hoc);
    await assertDateInsideIndex(id_index, date);

    const rowLop = await query(`SELECT id_lop FROM nhomhoc WHERE id_nhom_hoc=? LIMIT 1`, [id_nhom_hoc]);
    if (!rowLop.length) return res.status(404).send("Không tìm thấy nhóm");
    const id_lop = rowLop[0].id_lop;

    const lockKey = `cando_init_group_${id_nhom_hoc}_${date}_${id_index}`;
    const got = await query('SELECT GET_LOCK(?, 5) AS ok', [lockKey]);
    if (!got?.[0]?.ok) return res.status(409).send("Đang có người khởi tạo nhóm này cho ngày/kỳ này");

    try {
      const dateExpr = `DATE(c.ngay_thuc_hien + INTERVAL ${TZ_H} HOUR)`;
      const sql = `
        INSERT IGNORE INTO cando (
          id_tre_em, ten_day_du, ten_thuong_goi,
          id_lop, id_nhom_hoc, id_index, ngay_thuc_hien,
          can_nang, chieu_cao, id_nv,
          kq_can_nang, kq_chieu_cao, bmi,
          ngay_sinh, gioi_tinh, ghi_chu
        )
        SELECT
          t.id_tre_em,
          COALESCE(t.ten_day_du,''), COALESCE(t.ten_thuong_goi,''),
          n.id_lop, n.id_nhom_hoc, ?, ?,
          0, 0, ?,
          0, 0, 0,
          /* tránh zero-date */
          CASE 
            WHEN t.ngay_sinh IS NULL OR t.ngay_sinh='0000-00-00' OR t.ngay_sinh='' 
            THEN NULL ELSE t.ngay_sinh 
          END,
          t.gioi_tinh, NULL
        FROM treem t
        JOIN xeplophoc x ON x.id_tre_em=t.id_tre_em AND x.val=1
        JOIN nhomhoc n   ON n.id_nhom_hoc=x.id_nhom_hoc
        WHERE n.id_nhom_hoc=? AND t.trang_thai=1
          AND NOT EXISTS (
            SELECT 1 FROM cando c
             WHERE c.id_tre_em=t.id_tre_em
               AND c.id_nhom_hoc=n.id_nhom_hoc
               AND ${dateExpr} = ?
          )
      `;
      const r = await query(sql, [id_index, date, id_nv, id_nhom_hoc, date]);
      return res.json({ ok: true, inserted: r.affectedRows || 0, date, id_index, id_nhom_hoc, id_lop });
    } finally {
      await query('SELECT RELEASE_LOCK(?)', [lockKey]);
    }
  } catch (err) {
    console.error("[initGroupHandler] error:", err);
    return res.status(err.status || 500).send(err.message || "Lỗi khởi tạo nhóm");
  }
}

/* =========================
   UPDATE / DELETE
   ========================= */
async function updateCandoValues(req, res) {
  const id = toInt(req.params.id);
  if (id == null) return res.status(400).send("ID không hợp lệ");

  const id_nhom_hoc = toInt(req.body.id_nhom_hoc);
  const id_nv = toInt(req.body.id_nv);
  if (id_nhom_hoc == null) return res.status(400).send("Thiếu id_nhom_hoc");
  if (id_nv == null) return res.status(400).send("Thiếu id_nv");

  await assertNhanVienQuanLyNhom(id_nv, id_nhom_hoc);

  const chk = await query("SELECT id_nhom_hoc FROM cando WHERE id_can_do=?", [id]);
  if (!chk.length) return res.status(404).send("Không tìm thấy bản ghi");
  if (chk[0].id_nhom_hoc !== id_nhom_hoc) return res.status(403).send("Phiếu không thuộc nhóm này");

  const allow = ["can_nang", "chieu_cao", "kq_can_nang", "kq_chieu_cao", "bmi", "ghi_chu"];
  const sets = [], params = [];
  for (const k of allow) {
    if (req.body[k] !== undefined) { sets.push(`${k}=?`); params.push(req.body[k]); }
  }

  const hasCN = req.body.can_nang !== undefined;
  const hasCC = req.body.chieu_cao !== undefined;
  const bmiProvided = req.body.bmi !== undefined;
  const can_nang = Number(req.body.can_nang);
  const chieu_cao = Number(req.body.chieu_cao);
  if (!bmiProvided && hasCN && hasCC && can_nang > 0 && chieu_cao > 0) {
    const h = chieu_cao / 100;
    const bmiAuto = +(can_nang / (h * h)).toFixed(1);
    sets.push('bmi=?'); params.push(bmiAuto);
  }

  sets.push("id_nv=?"); params.push(id_nv);
  if (req.body.keep_date !== true) sets.push("ngay_thuc_hien=CURRENT_DATE()");
  if (!sets.length) return res.status(400).send("Không có trường cập nhật");

  params.push(id, id_nhom_hoc);
  const sql = `UPDATE cando SET ${sets.join(", ")} WHERE id_can_do=? AND id_nhom_hoc=?`;
  const r = await query(sql, params);
  if (!r.affectedRows) return res.status(404).send("Không tìm thấy bản ghi hoặc sai id_nhom_hoc");

  const rows = await query(`SELECT * FROM cando WHERE id_can_do=?`, [id]);
  const x = rows[0];
  const da_do =
    (x.can_nang ?? 0) > 0 || (x.chieu_cao ?? 0) > 0 ||
    (x.kq_can_nang ?? 0) > 0 || (x.kq_chieu_cao ?? 0) > 0 ||
    (x.bmi ?? 0) > 0 || String(x.ghi_chu ?? '').length > 0;

  return res.json({ message: "Cập nhật thành công", updated: { ...x, da_do: da_do ? 1 : 0 } });
}

async function deleteByGroupDate(req, res) {
  try {
    const id_nhom_hoc = toInt(req.params.id_nhom_hoc);
    const date = req.query.date;
    const id_index = toInt(req.query.id_index); // optional
    if (id_nhom_hoc == null) return res.status(400).send("Thiếu id_nhom_hoc");
    if (!isYYYYMMDD(date)) return res.status(400).send("Thiếu/ sai date YYYY-MM-DD");

    const dateExpr = `DATE(ngay_thuc_hien + INTERVAL ${TZ_H} HOUR)`;
    const cond = [`id_nhom_hoc=?`, `${dateExpr}=?`];
    const params = [id_nhom_hoc, date];
    if (id_index != null) { cond.push(`id_index=?`); params.push(id_index); }

    const r = await query(`DELETE FROM cando WHERE ${cond.join(' AND ')}`, params);
    return res.json({ ok: true, deleted: r.affectedRows || 0, date, id_nhom_hoc, id_index });
  } catch (err) {
    console.error("[deleteByGroupDate] error:", err);
    return res.status(500).send("Lỗi khi xoá cân đo theo ngày");
  }
}

/* =========================
   WRAPPER THEO NHÂN VIÊN
   ========================= */
async function listDatesByStaff(req, res) {
  try {
    const id_nv = toInt(req.params.id_nv);
    if (id_nv == null) return res.status(400).json({ ok: false, message: "Thiếu id_nv" });

    let id_nhom_hoc;
    try {
      id_nhom_hoc = await getManagedGroupId(id_nv);
    } catch (e) {
      if (e.status === 404) {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth() + 1;
        const from = `${y}-${String(m).padStart(2, '0')}-01`;
        const last = new Date(y, m, 0).getDate();
        const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
        return res.json({
          ok: true, id_nhom_hoc: null, from, to, days: [], total: 0,
          code: "NO_GROUP_FOR_STAFF", message: "Nhân viên chưa được phân công nhóm nào"
        });
      }
      throw e;
    }

    req.params.id_nhom_hoc = id_nhom_hoc;
    return listDatesByGroup(req, res);
  } catch (err) {
    console.error("[listDatesByStaff] error:", err);
    return res.status(err.status || 500).json({ ok: false, message: "Lỗi lấy danh sách ngày" });
  }
}

async function listByStaffAtDate(req, res) {
  try {
    const id_nv = toInt(req.params.id_nv);
    const date = req.query.date;
    if (id_nv == null) return res.status(400).json({ ok: false, message: "Thiếu id_nv" });
    if (!isYYYYMMDD(date)) return res.status(400).json({ ok: false, message: "Thiếu/ sai date YYYY-MM-DD" });

    let id_nhom_hoc;
    try {
      id_nhom_hoc = await getManagedGroupId(id_nv);
    } catch (e) {
      if (e.status === 404) return res.json([]); // tương thích client
      throw e;
    }

    req.params.id_nhom_hoc = id_nhom_hoc;
    return listByGroupAtDate(req, res);
  } catch (err) {
    console.error("[listByStaffAtDate] error:", err);
    return res.status(err.status || 500).json({ ok: false, message: "Lỗi truy vấn theo ngày" });
  }
}

async function initByStaff(req, res) {
  try {
    const id_nv = toInt(req.params.id_nv);
    if (id_nv == null) return res.status(400).json({ ok: false, message: "Thiếu id_nv" });

    const id_nhom_hoc = await getManagedGroupId(id_nv);
    let { id_index } = req.body || {};
    let date = req.body?.date || req.body?.ngay;
    if (!isYYYYMMDD(date)) date = getBusinessDate(); // ✅

    if (id_index == null) {
      const r = await query(
        `SELECT id_index FROM indexcount
          WHERE ? BETWEEN ngay_bat_dau AND ngay_ket_thuc
          ORDER BY ngay_bat_dau DESC, id_index DESC
          LIMIT 1`,
        [date]
      );
      if (!r.length) {
        return res.status(409).json({
          ok: false, code: "NO_PERIOD_FOR_DATE",
          message: "Không có kỳ nào bao trùm ngày này. Vui lòng tạo kỳ trước khi khởi tạo cân đo.", date
        });
      }
      id_index = r[0].id_index;
    } else {
      await assertDateInsideIndex(id_index, date);
    }

    req.params.id_nhom_hoc = id_nhom_hoc;
    req.body.id_nv = id_nv;
    req.body.id_index = id_index;
    req.body.date = date;
    return initGroupHandler(req, res);
  } catch (err) {
    console.error("[initByStaff] error:", err);
    if (err.status === 404 && err.message === "Nhân viên chưa được phân công nhóm nào") {
      return res.status(200).json({ ok: true, code: "NO_GROUP_FOR_STAFF", message: err.message, inserted: 0 });
    }
    return res.status(err.status || 500).json({ ok: false, message: err.message || "Lỗi khởi tạo theo nhân viên" });
  }
}

async function deleteByStaffDate(req, res) {
  try {
    const id_nv = toInt(req.params.id_nv);
    if (id_nv == null) return res.status(400).send("Thiếu id_nv");
    const id_nhom_hoc = await getManagedGroupId(id_nv);

    const id_index = toInt(req.query.id_index);
    const date = req.query.date;
    if (id_index != null && isYYYYMMDD(date)) await assertDateInsideIndex(id_index, date);

    req.params.id_nhom_hoc = id_nhom_hoc;
    return deleteByGroupDate(req, res);
  } catch (err) {
    console.error("[deleteByStaffDate] error:", err);
    return res.status(err.status || 500).send(err.message || "Lỗi xoá theo ngày");
  }
}

async function updateCandoValuesByStaff(req, res) {
  try {
    const id = toInt(req.params.id);
    const id_nv = toInt(req.body?.id_nv);
    if (id == null) return res.status(400).send("ID không hợp lệ");
    if (id_nv == null) return res.status(400).send("Thiếu id_nv");

    const id_nhom_hoc = await getManagedGroupId(id_nv);
    req.body.id_nhom_hoc = id_nhom_hoc;
    return updateCandoValues(req, res);
  } catch (err) {
    console.error("[updateCandoValuesByStaff] error:", err);
    return res.status(err.status || 500).send(err.message || "Lỗi cập nhật");
  }
}

module.exports = {
  listDatesByGroup,
  listByGroupAtDate,
  initGroupHandler,
  deleteByGroupDate,
  updateCandoValues,
  getCandoById,
  getCandoByTreEm,
  listDatesByStaff,
  listByStaffAtDate,
  initByStaff,
  deleteByStaffDate,
  updateCandoValuesByStaff,
};
