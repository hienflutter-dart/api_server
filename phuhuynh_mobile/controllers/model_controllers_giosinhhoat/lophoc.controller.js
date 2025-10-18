const { query } = require('../../../config/db');

const getAllLophoc = async (req, res) => {
  try {
    const lophocs = await query("SELECT * FROM lophoc");
    res.json(lophocs);
    console.log("Lấy tất cả lớp học thành công");
  } catch (err) {
    res.status(500).send("No data select");
  }
};

const getLophocById = async (req, res) => {
  try {
    const { id } = req.params;
    const lophoc = await query("SELECT * FROM lophoc WHERE id_lop = ?", [id]);
    console.log("Lấy lớp học theo ID thành công");

    if (lophoc.length > 0) {
      res.json(lophoc[0]);
    } else {
      res.status(404).send("Không tìm thấy lớp học");
    }
  } catch (err) {
    res.status(500).send("No data select");
  }
};

async function addLophoc(req, res) {
    const { ten_lop, ghi_chu, rtsp } = req.body;

    try {
        if (!ten_lop) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (ten_lop)' });
        }

        const result = await query(
            'INSERT INTO lophoc (ten_lop, ghi_chu, rtsp) VALUES (?, ?, ?)',
            [ten_lop, ghi_chu || null, rtsp || null]
        );

        const newLophoc = { id_lop: result.insertId, ten_lop, ghi_chu, rtsp };
        console.log('✅ Thêm lớp học thành công:', newLophoc);
        res.status(201).json({ message: 'Thêm lớp học thành công', data: newLophoc });
    } catch (err) {
        console.error('❌ Lỗi thêm lophoc:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function updateLophoc(req, res) {
    const { id } = req.params;
    const { ten_lop, ghi_chu, rtsp } = req.body;

    try {
        const result = await query(
            'UPDATE lophoc SET ten_lop = ?, ghi_chu = ?, rtsp = ? WHERE id_lop = ?',
            [ten_lop, ghi_chu || null, rtsp || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học để cập nhật' });
        }

        const updatedLophoc = await query('SELECT * FROM lophoc WHERE id_lop = ?', [id]);
        console.log(`✅ Cập nhật lớp học thành công:`, updatedLophoc[0]);
        res.status(200).json({ message: 'Cập nhật lớp học thành công', data: updatedLophoc[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật lophoc id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function deleteLophoc(req, res) {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM lophoc WHERE id_lop = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học để xóa' });
        }

        res.status(200).json({ message: 'Xóa lớp học thành công' });
        console.log(`✅ Xóa lớp học thành công với id=${id}`);
    } catch (err) {
        console.error(`❌ Lỗi xóa lophoc id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

function toInt(v){ const n = Number.parseInt(v,10); return Number.isNaN(n) ? null : n; }
function isDateStr(s){ return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

/**
 * GET /lophoc/getlopbytre/:id?date=YYYY-MM-DD
 * Trả về: { id_tre_em, id_lop, id_nhom_hoc, ten_lop, source }
 */
async function getlopbytre (req, res) {
  try {
    const id = toInt(req.params.id);
    if (id == null) return res.status(400).json({ message: "id_tre_em không hợp lệ", id_lop: null });

    const today = new Date();
    const dateParam = req.query.date && isDateStr(String(req.query.date).trim())
      ? String(req.query.date).trim()
      : `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // 1) Ưu tiên: lấy từ bảng PHÂN CÔNG/LỊCH SỬ (xeplophoc -> nhom_hoc -> lophoc)
    // - chọn bản ghi gần nhất có ngay_bat_dau <= dateParam
    // - nếu bạn muốn lọc chỉ active, giữ AND x.val = 1
    const rows = await query(
      `
      SELECT
        x.id_tre_em,
        x.id_nhom_hoc,
        nh.id_lop,
        l.ten_lop
      FROM xeplophoc x
      LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = x.id_nhom_hoc
      LEFT JOIN lophoc    l ON l.id_lop       = nh.id_lop
      WHERE x.id_tre_em = ?
        AND x.ngay_bat_dau <= ?
        AND x.val = 1
      ORDER BY x.ngay_bat_dau DESC, x.id_xlh DESC
      LIMIT 1
      `,
      [id, dateParam]
    );

    if (rows && rows.length && rows[0].id_lop) {
      const r = rows[0];
      return res.json({
        id_tre_em: id,
        id_lop: r.id_lop,
        id_nhom_hoc: r.id_nhom_hoc || null,
        ten_lop: r.ten_lop || null,
        source: "xeplophoc"
      });
    }

    // 2) Fallback: nếu không có dòng trong xeplophoc, thử lấy thẳng từ treem (nếu còn cột)
    try {
      const fb = await query(
        `
        SELECT t.id_tre_em, t.id_nhom_hoc, t.id_lop, l.ten_lop
        FROM treem t
        LEFT JOIN nhomhoc nh ON nh.id_nhom_hoc = t.id_nhom_hoc
        LEFT JOIN lophoc    l ON l.id_lop       = COALESCE(t.id_lop, nh.id_lop)
        WHERE t.id_tre_em = ?
        LIMIT 1
        `,
        [id]
      );
      if (fb && fb.length && fb[0].id_lop) {
        const r = fb[0];
        return res.json({
          id_tre_em: id,
          id_lop: r.id_lop,
          id_nhom_hoc: r.id_nhom_hoc || null,
          ten_lop: r.ten_lop || null,
          source: "treem"
        });
      }
    } catch { /* bỏ qua nếu không có bảng/không còn cột */ }

    // 3) Không xác định được
    return res.json({
      id_tre_em: id,
      id_lop: null,
      id_nhom_hoc: null,
      ten_lop: null,
      message: "Chưa xác định được lớp của bé tại thời điểm yêu cầu",
      at: dateParam
    });
  } catch (err) {
    console.error("getlopbytre error:", err);
    return res.status(500).json({ message: "Lỗi server", id_lop: null });
  }
};


module.exports = {
  getAllLophoc,
  getLophocById,
  addLophoc,
  updateLophoc,
  deleteLophoc,
  getlopbytre,                 // 👈 export thêm hàm mới
};
