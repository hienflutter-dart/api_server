const {query} = require("../../../config/db");

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

module.exports = { getAllLophoc, getLophocById, addLophoc, updateLophoc, deleteLophoc };