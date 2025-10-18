const { query } = require('../../../config/db');

async function getAllHoatdong(req, res) {
    try {
        const results = await query(`
            SELECT id_hoat_dong, ten_hoat_dong, ky_hieu
            FROM hoatdong
        `);

        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi truy vấn toàn bộ hoatdong:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function getHoatdongById(req, res) {
    const { id } = req.params;

    try {
        const results = await query('SELECT * FROM hoatdong WHERE id_hoat_dong = ?', [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy hoạt động' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error(`❌ Lỗi truy vấn hoatdong theo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function createHoatdong(req, res) {
    const { ten_hoat_dong, ky_hieu } = req.body;

    try {
        if (!ten_hoat_dong) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (ten_hoat_dong)' });
        }

        const result = await query(
            `INSERT INTO hoatdong (ten_hoat_dong, ky_hieu)
         VALUES (?, ?)`,
            [ten_hoat_dong, ky_hieu]
        );

        const newHoatdong = { id_hoat_dong: result.insertId, ten_hoat_dong };
        res.status(201).json({ message: 'Thêm hoạt động thành công', data: newHoatdong });
    } catch (err) {
        console.error('❌ Lỗi thêm hoatdong:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function updateHoatdong(req, res) {
    const { id } = req.params;
    const { ten_hoat_dong } = req.body;
    const { ky_hieu } = req.body;
    try {
        const result = await query(
            'UPDATE hoatdong SET ten_hoat_dong = ?, ky_hieu = ? WHERE id_hoat_dong = ?',
            [ten_hoat_dong, ky_hieu, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy hoạt động để cập nhật' });
        }

        const updatedHoatdong = await query('SELECT * FROM hoatdong WHERE id_hoat_dong = ?', [id]);
        res.status(200).json({ message: 'Cập nhật hoạt động thành công', data: updatedHoatdong[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật hoatdong id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function deleteHoatdong(req, res) {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM hoatdong WHERE id_hoat_dong = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy hoạt động để xóa' });
        }

        res.status(200).json({ message: 'Xóa hoạt động thành công' });
    } catch (err) {
        console.error(`❌ Lỗi xóa hoatdong id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

module.exports = {
    getAllHoatdong,
    getHoatdongById,
    createHoatdong,
    updateHoatdong,
    deleteHoatdong,
};