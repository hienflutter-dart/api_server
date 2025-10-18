const { query } = require('../../../config/db');

const getAllChude = async (req, res) => {
    try {
        const results = await query(`
            SELECT id_chu_de, ten_chu_de
            FROM chude
        `);

        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi truy vấn toàn bộ chude:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}



const getChudeById = async (req, res) => {
    const { id } = req.params;

    try {
        const results = await query('SELECT * FROM chude WHERE id_chu_de = ?', [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy chủ đề' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error(`❌ Lỗi truy vấn chude theo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}


const createChude = async (req, res) => {
    const { ten_chu_de } = req.body;

    try {
        if (!ten_chu_de) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (ten_chu_de)' });
        }

        const result = await query(
            'INSERT INTO chude (ten_chu_de) VALUES (?)',
            [ten_chu_de]
        );

        const newChude = { id_chu_de: result.insertId, ten_chu_de };
        res.status(201).json({ message: 'Thêm chủ đề thành công', data: newChude });
    } catch (err) {
        console.error('❌ Lỗi thêm chude:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}



const updateChude = async (req, res) => {
    const { id } = req.params;
    const { ten_chu_de } = req.body;

    try {
        const result = await query(
            'UPDATE chude SET ten_chu_de = ? WHERE id_chu_de = ?',
            [ten_chu_de, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy chủ đề để cập nhật' });
        }

        const updatedChude = await query('SELECT * FROM chude WHERE id_chu_de = ?', [id]);
        res.status(200).json({ message: 'Cập nhật chủ đề thành công', data: updatedChude[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật chude id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}


const deleteChude = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM chude WHERE id_chu_de = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy chủ đề để xóa' });
        }

        res.status(200).json({ message: 'Xóa chủ đề thành công' });
    } catch (err) {
        console.error(`❌ Lỗi xóa chude id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

module.exports = {
    getAllChude,
    getChudeById,
    createChude,
    updateChude,
    deleteChude,
};