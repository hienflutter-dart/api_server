const { query } = require('../../../config/db');

function addMinutes(t, minutes) {
  const [H, M, S = 0] = t.split(':').map(Number);
  const d = new Date(2000, 0, 1, H, M + minutes, S);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
function jsDayToVN(jsDay) { return jsDay === 0 ? 8 : jsDay + 1; }

function findIndexIdForDate(dateStr, indexRanges) {
  const d = new Date(dateStr);
  for (const r of indexRanges) {
    const from = new Date(r.ngay_bat_dau);
    const to = new Date(r.ngay_ket_thuc);
    if (d >= from && d <= to) return r.id_index;
  }
  return null;
}

function fmt(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function inRange(day, start, end) {
  return day >= start && day <= end;
}

async function generateLichSinhHoat(req, res) {
  const {
    id_lop,
    ngay_bat_dau,
    ngay_ket_thuc,
    day_start,
    day_end,
    weekplan = {}
  } = req.body || {};

  if (!id_lop || !ngay_bat_dau || !ngay_ket_thuc) {
    return res.status(400).json({ message: 'Thiếu id_lop / ngay_bat_dau / ngay_ket_thuc' });
  }

  let conn;
  try {
    conn = await getConnection();
    await conn.beginTransaction();

    const start = new Date(ngay_bat_dau);
    const end = new Date(ngay_ket_thuc);
    if (isNaN(start) || isNaN(end) || start > end) {
      await conn.rollback();
      return res.status(400).json({ message: 'Khoảng ngày không hợp lệ' });
    }

    // 1) Kỳ (index)
    const [indexRows] = await conn.query(`
      SELECT id_index, ngay_bat_dau, ngay_ket_thuc
      FROM indexcount
    `);

    // 2) Hoạt động
    const [hdRows] = await conn.query(
      `SELECT id_hoat_dong, ky_hieu, ten_hoat_dong FROM hoatdong`
    );
    const kyByHd = new Map(hdRows.map(r => [r.id_hoat_dong, r.ky_hieu]));
    const nameByHd = new Map(hdRows.map(r => [r.id_hoat_dong, r.ten_hoat_dong]));

    // 3) Thực đơn
    // 3) Prefetch thucdon trong khoảng ngày -> Map('YYYY-MM-DD' => id_td)
    const [tdRows] = await conn.query(`
SELECT
  id_td,
  DATE_FORMAT(
    DATE(CONCAT(td_nam,'-',LPAD(td_thang,2,'0'),'-',LPAD(td_ngay,2,'0'))),
    '%Y-%m-%d'
  ) AS td_date
FROM thucdon
WHERE DATE(CONCAT(td_nam,'-',LPAD(td_thang,2,'0'),'-',LPAD(td_ngay,2,'0')))
      BETWEEN ? AND ?
`, [ngay_bat_dau, ngay_ket_thuc]);

    const tdByDate = new Map();
    for (const r of tdRows) {
      const key = r.td_date; // đã là 'YYYY-MM-DD'
      tdByDate.set(key, r.id_td);
    }


    let created = 0;
    const createdIds = [];
    const errors = [];

    // 4) Duyệt từng ngày
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const jsDay = d.getDay();
      const vnDay = jsDayToVN(jsDay);
      const acts = weekplan[String(vnDay)];
      if (!acts || acts.length === 0) continue;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const lsh_ngay = `${yyyy}-${mm}-${dd}`;
      const lsh_thu = vnDay === 8 ? 'Chủ nhật' : `Thứ ${vnDay}`;

      const id_index_for_day = findIndexIdForDate(lsh_ngay, indexRows);
      if (id_index_for_day == null) {
        errors.push(`Không tìm thấy kỳ (index) cho ngày ${lsh_ngay}`);
        break;
      }

      let lastEnd = day_start || null;

      for (const a of acts) {
        const { id_hoat_dong, start: s, end: e, duration_min } = a || {};
        let { id_sinh_hoat } = a || {};
        if (!id_hoat_dong) continue;

        let startAt = s || lastEnd;
        if (!startAt) continue;
        let endAt = e || (duration_min ? addMinutes(startAt, duration_min) : null);
        if (!endAt) continue;

        if (day_end && endAt > day_end) {
          endAt = day_end;
          if (endAt <= startAt) continue;
        }

        const ky = kyByHd.get(id_hoat_dong);
        const name = nameByHd.get(id_hoat_dong) || `HD#${id_hoat_dong}`;

        // xử lý id_sinh_hoat theo ky_hieu
        if (['AS', 'AT', 'TM', 'AC'].includes(ky)) {
          const id_td = tdByDate.get(lsh_ngay) ?? null;
          if (!id_td) {
            errors.push(`Ngày ${lsh_ngay} - hoạt động ${name} (${ky}) chưa có thực đơn.`);
            continue;
          }
          id_sinh_hoat = id_td;
        } else if (ky === 'HT') {
          if (!id_sinh_hoat) {
            errors.push(`Ngày ${lsh_ngay} - hoạt động ${name} (HT) chưa có bài giảng.`);
            continue;
          }
        } else {
          // các hoạt động khác
          id_sinh_hoat = 0;
        }

        // tạo/reuse giosinhhoat
        const [exist] = await conn.query(
          `SELECT id_gio_sinh_hoat
             FROM giosinhhoat
            WHERE id_lop = ? AND id_hoat_dong = ?
              AND gio_bat_dau = ? AND gio_ket_thuc = ?
            LIMIT 1`,
          [id_lop, id_hoat_dong, startAt, endAt]
        );

        let id_gio_sinh_hoat;
        if (Array.isArray(exist) && exist.length > 0) {
          id_gio_sinh_hoat = exist[0].id_gio_sinh_hoat;
        } else {
          const [insG] = await conn.query(
            `INSERT INTO giosinhhoat (id_lop, id_hoat_dong, gio_bat_dau, gio_ket_thuc)
             VALUES (?, ?, ?, ?)`,
            [id_lop, id_hoat_dong, startAt, endAt]
          );
          id_gio_sinh_hoat = insG.insertId;
        }

        // insert lichsinhhoat
        const [insLSH] = await conn.query(
          `INSERT INTO lichsinhhoat
             (id_index, lsh_thu, lsh_ngay, id_gio_sinh_hoat, id_lop, id_hoat_dong, id_sinh_hoat)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id_index_for_day,
            lsh_thu,
            lsh_ngay,
            id_gio_sinh_hoat,
            id_lop,
            id_hoat_dong,
            id_sinh_hoat
          ]
        );

        created++;
        createdIds.push(insLSH.insertId);
        lastEnd = endAt;
      }
    }

    if (errors.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Không tạo được đầy đủ lịch sinh hoạt.',
        details: errors,
      });
    }

    await conn.commit();
    return res.status(201).json({
      message: `Đã tạo ${created} lịch sinh hoạt`,
      created_count: created,
      created_ids: createdIds,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('❌ generateLichSinhHoat error:', err);
    return res.status(500).json({ message: 'Lỗi server' });
  } finally {
    if (conn) conn.release();
  }
}


async function checkLichSinhHoat(req, res) {
  const { id_lop, ngay_bat_dau, ngay_ket_thuc } = req.query || {};
  if (!id_lop || !ngay_bat_dau || !ngay_ket_thuc) {
    return res.status(400).json({ message: 'Thiếu id_lop / ngay_bat_dau / ngay_ket_thuc' });
  }

  const from = new Date(ngay_bat_dau);
  const to   = new Date(ngay_ket_thuc);
  if (isNaN(from) || isNaN(to) || from > to) {
    return res.status(400).json({ message: 'Khoảng ngày không hợp lệ' });
  }

  let conn;
  try {
    conn = await getConnection();

    // 1) Lấy tất cả kỳ indexcount (để kiểm tra phủ từng ngày)
    const [indexRows] = await conn.query(`
      SELECT id_index, ngay_bat_dau, ngay_ket_thuc
      FROM indexcount
    `);

    // 2) Kiểm tra từng ngày có nằm trong 1 kỳ nào không
    const noIndexDays = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dStr = fmt(d);
      const has = indexRows.some(r =>
        inRange(new Date(dStr), new Date(r.ngay_bat_dau), new Date(r.ngay_ket_thuc))
      );
      if (!has) noIndexDays.push(dStr);
    }
    if (noIndexDays.length > 0) {
      return res.status(400).json({
        message: 'Một số ngày không thuộc kỳ indexcount.',
        no_index_days: noIndexDays,
      });
    }

    // 3) Kiểm tra lớp đã có lịch trong khoảng ngày chưa
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt, MIN(lsh_ngay) AS first_day, MAX(lsh_ngay) AS last_day
         FROM lichsinhhoat
        WHERE id_lop = ? AND lsh_ngay BETWEEN ? AND ?`,
      [id_lop, ngay_bat_dau, ngay_ket_thuc]
    );

    const cnt = rows?.[0]?.cnt ?? 0;
    if (cnt > 0) {
      return res.status(409).json({
        message: 'Lớp đã có lịch trong khoảng ngày yêu cầu.',
        existing_count: cnt,
        first_day: rows[0].first_day,
        last_day: rows[0].last_day,
      });
    }

    // OK
    return res.json({
      ok: true,
      message: 'Hợp lệ: có index cho toàn bộ khoảng ngày và chưa có lịch trùng.',
      range: { from: ngay_bat_dau, to: ngay_ket_thuc },
    });
  } catch (err) {
    console.error('checkLichSinhHoat error:', err);
    return res.status(500).json({ message: 'Lỗi server' });
  } finally {
    if (conn) conn.release();
  }
}

async function checkThucDonInRange(req, res) {
  try {
    const from = (req.query.ngay_bat_dau || req.body?.ngay_bat_dau || '').trim();
    const to   = (req.query.ngay_ket_thuc || req.body?.ngay_ket_thuc || '').trim();

    if (!from || !to) {
      return res.status(400).json({ ok: false, message: 'Thiếu ngay_bat_dau / ngay_ket_thuc' });
    }

    const dFrom = new Date(from);
    const dTo   = new Date(to);
    if (isNaN(dFrom) || isNaN(dTo) || dFrom > dTo) {
      return res.status(400).json({ ok: false, message: 'Khoảng ngày không hợp lệ' });
    }

    // Lấy các bản ghi thucdon có td_date trong khoảng [from, to]
    // td_date = DATE(td_nam-td_thang-td_ngay)
    const sql = `
      SELECT
        td_id,
        td_nam, td_thang, td_ngay,
        STR_TO_DATE(
          CONCAT(td_nam,'-',LPAD(td_thang,2,'0'),'-',LPAD(td_ngay,2,'0')),
          '%Y-%m-%d'
        ) AS td_date
      FROM thucdon
      WHERE STR_TO_DATE(
              CONCAT(td_nam,'-',LPAD(td_thang,2,'0'),'-',LPAD(td_ngay,2,'0')),
              '%Y-%m-%d'
            ) BETWEEN ? AND ?
      ORDER BY td_date
    `;

    const rows = await query(sql, [from, to]);

    // Dựng tập ngày đã có thực đơn
    const haveSet = new Set(
      rows
        .map(r => r.td_date)
        .filter(Boolean)
        .map(d => {
          const dt = new Date(d);
          const yyyy = dt.getFullYear();
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        })
    );

    // Duyệt tất cả ngày trong khoảng, tìm missing
    const missing = [];
    const existing = [];
    for (let d = new Date(dFrom); d <= dTo; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      if (haveSet.has(key)) existing.push(key);
      else missing.push(key);
    }

    return res.json({
      ok: true,
      from,
      to,
      has_all: missing.length === 0,
      missing_dates: missing,
      existing_dates: existing,
      count_exist: existing.length,
      count_missing: missing.length,
    });
  } catch (err) {
    console.error('checkThucDonInRange error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server', error: err.message });
  }
}

module.exports = { generateLichSinhHoat, checkLichSinhHoat , checkThucDonInRange};
