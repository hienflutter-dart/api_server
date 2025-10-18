const { query } = require('../../../config/db');

async function getAllPhanbo(req, res) {
    try {
        const results = await query(`
            SELECT 
                pb.id_phan_bo, 
                pb.id_lop, 
                pb.id_bai_giang, 
                bg.ten_bai_giang,         -- Lấy tên bài giảng
                pb.ngay_bat_dau, 
                pb.ngay_ket_thuc
            FROM phanbo pb
            JOIN baigiang bg ON pb.id_bai_giang = bg.id_bai_giang
        `);

        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi truy vấn toàn bộ phanbo:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function getPhanboById(req, res) {
    const { id } = req.params;

    try {
        const results = await query(`
            SELECT 
                pb.id_phan_bo, 
                pb.id_lop, 
                pb.id_bai_giang, 
                bg.ten_bai_giang,
                pb.ngay_bat_dau, 
                pb.ngay_ket_thuc
            FROM phanbo pb
            JOIN baigiang bg ON pb.id_bai_giang = bg.id_bai_giang
            WHERE pb.id_phan_bo = ?
        `, [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy phân bổ' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error(`❌ Lỗi truy vấn phanbo theo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function createPhanbo(req, res) {
    const { id_lop, id_bai_giang, ngay_bat_dau, ngay_ket_thuc } = req.body;

    try {
        if (!id_lop  || !id_bai_giang || !ngay_bat_dau || !ngay_ket_thuc) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        const result = await query(
            'INSERT INTO phanbo (id_lop, id_bai_giang, ngay_bat_dau, ngay_ket_thuc) VALUES ( ?, ?, ?, ?)',
            [id_lop, id_bai_giang, ngay_bat_dau, ngay_ket_thuc]
        );

        const newPhanbo = await query(`
            SELECT 
                pb.id_phan_bo, 
                pb.id_lop,
                pb.id_bai_giang, 
                bg.ten_bai_giang,
                pb.ngay_bat_dau, 
                pb.ngay_ket_thuc
            FROM phanbo pb
            JOIN baigiang bg ON pb.id_bai_giang = bg.id_bai_giang
            WHERE pb.id_phan_bo = ?
        `, [result.insertId]);

        res.status(201).json({ message: 'Thêm phân bổ thành công', data: newPhanbo[0] });
    } catch (err) {
        console.error('❌ Lỗi thêm phanbo:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function updatePhanbo(req, res) {
    const { id } = req.params;
    const { id_lop, id_bai_giang, ngay_bat_dau, ngay_ket_thuc } = req.body;

    try {
        const result = await query(
            'UPDATE phanbo SET id_lop = ?,  id_bai_giang = ?, ngay_bat_dau = ?, ngay_ket_thuc = ? WHERE id_phan_bo = ?',
            [id_lop, id_bai_giang, ngay_bat_dau, ngay_ket_thuc, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy phân bổ để cập nhật' });
        }

        const updatedPhanbo = await query(`
            SELECT 
                pb.id_phan_bo, 
                pb.id_lop, 
                pb.id_bai_giang, 
                bg.ten_bai_giang,
                pb.ngay_bat_dau, 
                pb.ngay_ket_thuc
            FROM phanbo pb
            JOIN baigiang bg ON pb.id_bai_giang = bg.id_bai_giang
            WHERE pb.id_phan_bo = ?
        `, [id]);

        res.status(200).json({ message: 'Cập nhật phân bổ thành công', data: updatedPhanbo[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật phanbo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function deletePhanbo(req, res) {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM phanbo WHERE id_phan_bo = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy phân bổ để xóa' });
        }

        res.status(200).json({ message: 'Xóa phân bổ thành công' });
    } catch (err) {
        console.error(`❌ Lỗi xóa phanbo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

async function checkPhanBoByLop(req, res)  {
    try {
      const { id_lop, ngay_bat_dau, ngay_ket_thuc } = req.query;
  
      if (!id_lop || !ngay_bat_dau || !ngay_ket_thuc) {
        return res.status(400).json({ message: "Thiếu id_lop / ngày bắt đầu / ngày kết thúc" });
      }
  
      // lấy danh sách phân bổ trong range
      const sql = `
        SELECT p.id_phan_bo, p.id_lop, p.id_bai_giang, p.ngay_bat_dau, p.ngay_ket_thuc,
               b.ten_bai_giang
        FROM phanbo p
        JOIN baigiang b ON p.id_bai_giang = b.id_bai_giang
        WHERE p.id_lop = ?
          AND (
            (p.ngay_bat_dau BETWEEN ? AND ?)
            OR (p.ngay_ket_thuc BETWEEN ? AND ?)
            OR (? BETWEEN p.ngay_bat_dau AND p.ngay_ket_thuc)
            OR (? BETWEEN p.ngay_bat_dau AND p.ngay_ket_thuc)
          )
        ORDER BY p.ngay_bat_dau
      `;
      const rows = await query(sql, [
        id_lop, ngay_bat_dau, ngay_ket_thuc, ngay_bat_dau, ngay_ket_thuc,
        ngay_bat_dau, ngay_ket_thuc,
      ]);
  
      if (rows.length === 0) {
        return res.status(404).json({
          message: `Không tìm thấy phân bổ nào cho lớp ${id_lop} trong khoảng ${ngay_bat_dau} - ${ngay_ket_thuc}`,
        });
      }
  
      return res.json({
        message: `Tìm thấy ${rows.length} phân bổ`,
        count: rows.length,
        items: rows,
      });
    } catch (err) {
      console.error("❌ checkPhanBoByLop error:", err);
      return res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  };
  
  

module.exports = {
    getAllPhanbo,
    getPhanboById,
    createPhanbo,
    updatePhanbo,
    deletePhanbo,
    checkPhanBoByLop
};
