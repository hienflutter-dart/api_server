const { query } = require('../../../config/db');

async function getAllTc_lopnk(req, res) {
    try {
        const results = await query(`
            SELECT id_lop_nk, ten_lop_nk, ghi_chu
            FROM tc_lopnk
        `);

        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi truy vấn toàn bộ tc_lopnk:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function getTc_lopnkById(req, res) {
    const { id } = req.params;

    try {
        const results = await query('SELECT * FROM tc_lopnk WHERE id_lop_nk = ?', [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp niên khóa' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error(`❌ Lỗi truy vấn tc_lopnk theo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function createTc_lopnk(req, res) {
    const { ten_lop_nk, ghi_chu } = req.body;

    try {
        if (!ten_lop_nk) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (ten_lop_nk)' });
        }

        const result = await query(
            'INSERT INTO tc_lopnk (ten_lop_nk, ghi_chu) VALUES (?, ?)',
            [ten_lop_nk, ghi_chu || null]
        );

        const newTc_lopnk = { id_lop_nk: result.insertId, ten_lop_nk, ghi_chu };
        res.status(201).json({ message: 'Thêm lớp niên khóa thành công', data: newTc_lopnk });
    } catch (err) {
        console.error('❌ Lỗi thêm tc_lopnk:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function updateTc_lopnk(req, res) {
    const { id } = req.params;
    const { ten_lop_nk, ghi_chu } = req.body;

    try {
        const result = await query(
            'UPDATE tc_lopnk SET ten_lop_nk = ?, ghi_chu = ? WHERE id_lop_nk = ?',
            [ten_lop_nk, ghi_chu || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp niên khóa để cập nhật' });
        }

        const updatedTc_lopnk = await query('SELECT * FROM tc_lopnk WHERE id_lop_nk = ?', [id]);
        res.status(200).json({ message: 'Cập nhật lớp niên khóa thành công', data: updatedTc_lopnk[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật tc_lopnk id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function deleteTc_lopnk(req, res) {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM tc_lopnk WHERE id_lop_nk = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp niên khóa để xóa' });
        }

        res.status(200).json({ message: 'Xóa lớp niên khóa thành công' });
    } catch (err) {
        console.error(`❌ Lỗi xóa tc_lopnk id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

module.exports = {
    getAllTc_lopnk,
    getTc_lopnkById,
    createTc_lopnk,
    updateTc_lopnk,
    deleteTc_lopnk,
};