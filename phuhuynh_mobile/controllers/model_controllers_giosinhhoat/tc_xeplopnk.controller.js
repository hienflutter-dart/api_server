const { query } = require('../../../config/db');

async function getAllTc_xeplopnk(req, res) {
    try {
        const results = await query(`
            SELECT id_xep_lop_nk, id_lop_nk, id_tre_em
            FROM tc_xeplopnk
        `);

        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi truy vấn toàn bộ tc_xeplopnk:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function getTc_xeplopnkById(req, res) {
    const { id } = req.params;

    try {
        const results = await query('SELECT * FROM tc_xeplopnk WHERE id_xep_lop_nk = ?', [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy xếp lớp niên khóa' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error(`❌ Lỗi truy vấn tc_xeplopnk theo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function createTc_xeplopnk(req, res) {
    const { id_lop_nk, id_tre_em } = req.body;

    try {
        if (!id_lop_nk || !id_tre_em) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (id_lop_nk, id_tre_em)' });
        }

        const result = await query(
            'INSERT INTO tc_xeplopnk (id_lop_nk, id_tre_em) VALUES (?, ?)',
            [id_lop_nk, id_tre_em]
        );

        const newTc_xeplopnk = { id_xep_lop_nk: result.insertId, id_lop_nk, id_tre_em };
        res.status(201).json({ message: 'Thêm xếp lớp niên khóa thành công', data: newTc_xeplopnk });
    } catch (err) {
        console.error('❌ Lỗi thêm tc_xeplopnk:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function updateTc_xeplopnk(req, res) {
    const { id } = req.params;
    const { id_lop_nk, id_tre_em } = req.body;

    try {
        const result = await query(
            'UPDATE tc_xeplopnk SET id_lop_nk = ?, id_tre_em = ? WHERE id_xep_lop_nk = ?',
            [id_lop_nk, id_tre_em, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy xếp lớp niên khóa để cập nhật' });
        }

        const updatedTc_xeplopnk = await query('SELECT * FROM tc_xeplopnk WHERE id_xep_lop_nk = ?', [id]);
        res.status(200).json({ message: 'Cập nhật xếp lớp niên khóa thành công', data: updatedTc_xeplopnk[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật tc_xeplopnk id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function deleteTc_xeplopnk(req, res) {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM tc_xeplopnk WHERE id_xep_lop_nk = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy xếp lớp niên khóa để xóa' });
        }

        res.status(200).json({ message: 'Xóa xếp lớp niên khóa thành công' });
    } catch (err) {
        console.error(`❌ Lỗi xóa tc_xeplopnk id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

module.exports = {
    getAllTc_xeplopnk,
    getTc_xeplopnkById,
    createTc_xeplopnk,
    updateTc_xeplopnk,
    deleteTc_xeplopnk,
};