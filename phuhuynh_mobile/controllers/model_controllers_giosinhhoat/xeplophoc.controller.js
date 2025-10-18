const { query } = require('../../../config/db');

const getAllXeplophoc = async (req, res) => {
    try {
        const results = await query(`
            SELECT id_xlh, id_tre_em, id_nhom_hoc, ngay_bat_dau, val
            FROM xeplophoc
        `);

        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi truy vấn toàn bộ xeplophoc:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function getXeplophocById(req, res) {
    const { id } = req.params;

    try {
        const results = await query('SELECT * FROM xeplophoc WHERE id_xlh = ?', [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy xếp lớp học' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error(`❌ Lỗi truy vấn xeplophoc theo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function createXeplophoc(req, res) {
    const { id_tre_em, id_nhom_hoc, ngay_bat_dau, val } = req.body;

    try {
        if (!id_tre_em || !id_nhom_hoc || !ngay_bat_dau || !val) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        const result = await query(
            'INSERT INTO xeplophoc (id_tre_em, id_nhom_hoc, ngay_bat_dau, val) VALUES (?, ?, ?, ?)',
            [id_tre_em, id_nhom_hoc, ngay_bat_dau, val]
        );

        const newXeplophoc = { id_xlh: result.insertId, id_tre_em, id_nhom_hoc, ngay_bat_dau, val };
        res.status(201).json({ message: 'Thêm xếp lớp học thành công', data: newXeplophoc });
    } catch (err) {
        console.error('❌ Lỗi thêm xeplophoc:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function updateXeplophoc(req, res) {
    const { id } = req.params;
    const { id_tre_em, id_nhom_hoc, ngay_bat_dau, val } = req.body;

    try {
        const result = await query(
            'UPDATE xeplophoc SET id_tre_em = ?, id_nhom_hoc = ?, ngay_bat_dau = ?, val = ? WHERE id_xlh = ?',
            [id_tre_em, id_nhom_hoc, ngay_bat_dau, val, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy xếp lớp học để cập nhật' });
        }

        const updatedXeplophoc = await query('SELECT * FROM xeplophoc WHERE id_xlh = ?', [id]);
        res.status(200).json({ message: 'Cập nhật xếp lớp học thành công', data: updatedXeplophoc[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật xeplophoc id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function deleteXeplophoc(req, res) {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM xeplophoc WHERE id_xlh = ?', [id]);

        if (result.affectedRows === 0) {return res.status(404).json({ message: 'Không tìm thấy xếp lớp học để xóa' });
        }

        res.status(200).json({ message: 'Xóa xếp lớp học thành công' });
    } catch (err) {
        console.error(`❌ Lỗi xóa xeplophoc id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

module.exports = {
    getAllXeplophoc,
    getXeplophocById,
    createXeplophoc,
    updateXeplophoc,
    deleteXeplophoc,
};