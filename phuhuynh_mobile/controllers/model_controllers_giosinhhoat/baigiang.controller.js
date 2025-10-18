const { query } = require('../../../config/db');

const getAllBaigiang = async  (req, res) => {
    try {
        const results = await query(`
            SELECT 
          b.id_bai_giang,
          b.id_chu_de,
          c.ten_chu_de,
          b.ten_bai_giang,
          b.tom_tat,
          b.noi_dung
        FROM baigiang b
        LEFT JOIN chude c ON b.id_chu_de = c.id_chu_de
        `);

        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi truy vấn toàn bộ baigiang:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

const getBaigiangById = async  (req, res) => {
    const { id } = req.params;

    try {

        const results = await query(`
            SELECT 
          b.id_bai_giang,
          b.id_chu_de,
          c.ten_chu_de,
          b.ten_bai_giang,
          b.tom_tat,
          b.noi_dung
        FROM baigiang b
        LEFT JOIN chude c ON b.id_chu_de = c.id_chu_de
        WHERE b.id_bai_giang = ?
        `, [id]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy bài giảng' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error(`❌ Lỗi truy vấn baigiang theo id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

const createBaigiang = async  (req, res) =>{
    const { id_chu_de, ten_bai_giang, tom_tat, noi_dung } = req.body;
    try {
      if (!id_chu_de || !ten_bai_giang) {
        return res.status(400).json({ message: 'Thiếu id_chu_de hoặc ten_bai_giang' });
      }
      const result = await query(
        `INSERT INTO baigiang (id_chu_de, ten_bai_giang, tom_tat, noi_dung)
         VALUES (?, ?, ?, ?)`,
        [id_chu_de, ten_bai_giang, tom_tat ?? '', noi_dung ?? '']
      );
  
      const [row] = await query(`
        SELECT b.id_bai_giang, b.id_chu_de, c.ten_chu_de, b.ten_bai_giang, b.tom_tat, b.noi_dung
        FROM baigiang b
        LEFT JOIN chude c ON b.id_chu_de = c.id_chu_de
        WHERE b.id_bai_giang = ?`,
        [result.insertId]
      );
  
      res.status(201).json({ message: 'Thêm bài giảng thành công', data: row });
    } catch (err) {
      console.error('❌ Lỗi thêm baigiang:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }
  

const updateBaigiang = async  (req, res) => {
    const { id } = req.params;
    const { id_chu_de, ten_bai_giang, tom_tat, noi_dung } = req.body;

    try {
        const result = await query(
            'UPDATE baigiang SET id_chu_de = ?, ten_bai_giang = ?, tom_tat = ?, noi_dung = ? WHERE id_bai_giang = ?',
            [id_chu_de, ten_bai_giang, tom_tat, noi_dung, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy bài giảng để cập nhật' });
        }

        const updatedBaigiang = await query('SELECT * FROM baigiang WHERE id_bai_giang = ?', [id]);
        res.status(200).json({ message: 'Cập nhật bài giảng thành công', data: updatedBaigiang[0] });
    } catch (err) {
        console.error(`❌ Lỗi cập nhật baigiang id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}

const deleteBaigiang = async  (req, res) => {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM baigiang WHERE id_bai_giang = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy bài giảng để xóa' });
        }

        res.status(200).json({ message: 'Xóa bài giảng thành công' });
    } catch (err) {
        console.error(`❌ Lỗi xóa baigiang id=${id}:`, err);
        res.status(500).json({ message: 'Lỗi server' });
    }
}


const listBaiGiangByRange = async  (req, res) => {
    const { id_lop, ngay_bat_dau, ngay_ket_thuc } = req.query;
  
    if (!id_lop || !ngay_bat_dau || !ngay_ket_thuc) {
      return res.status(400).json({ message: 'Thiếu id_lop hoặc khoảng ngày' });
    }
  
    try {
      // Log để debug
      const [dbRow] = await query('SELECT DATABASE() AS db');
      console.log('[range] DB =', dbRow?.db);
      console.log('[range] id_lop=%s, from=%s, to=%s', id_lop, ngay_bat_dau, ngay_ket_thuc);
  
      // Đếm số dòng overlap ngay trong Node
      const countSql = `
        SELECT COUNT(*) AS n
        FROM phanbo pb
        WHERE pb.id_lop = ?
          AND NOT (
            DATE(TRIM(pb.ngay_ket_thuc)) < STR_TO_DATE(?, '%Y-%m-%d')
            OR DATE(TRIM(pb.ngay_bat_dau)) > STR_TO_DATE(?, '%Y-%m-%d')
          )
      `;
      const cnt = await query(countSql, [id_lop, ngay_bat_dau, ngay_ket_thuc]);
      console.log('[range] overlap count =', cnt?.[0]?.n);
  
      // Lấy dữ liệu chi tiết
      const dataSql = `
        SELECT
          bg.id_bai_giang,
          bg.ten_bai_giang,
          bg.tom_tat,
          bg.noi_dung,
          pb.ngay_bat_dau,
          pb.ngay_ket_thuc,
          c.ten_chu_de
        FROM phanbo pb
        LEFT JOIN baigiang bg ON pb.id_bai_giang = bg.id_bai_giang
        LEFT JOIN chude    c  ON bg.id_chu_de    = c.id_chu_de
        WHERE pb.id_lop = ?
          AND NOT (
            DATE(TRIM(pb.ngay_ket_thuc)) < STR_TO_DATE(?, '%Y-%m-%d')
            OR DATE(TRIM(pb.ngay_bat_dau)) > STR_TO_DATE(?, '%Y-%m-%d')
          )
        ORDER BY pb.ngay_bat_dau ASC, bg.ten_bai_giang ASC
      `;
      const rows = await query(dataSql, [id_lop, ngay_bat_dau, ngay_ket_thuc]);
      console.log('[range] rows.length =', rows.length);
  
      if (!rows || rows.length === 0) {
        // Trả luôn overlap_count để bạn nhìn trên Postman
        return res.status(404).json({
          message: 'Không tìm thấy bài giảng',
          overlap_count: cnt?.[0]?.n ?? 0
        });
      }
      return res.json(rows);
    } catch (err) {
      console.error('❌ Lỗi listBaiGiangByRange:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }
  }
  
  
  

module.exports = {
    getAllBaigiang,
    getBaigiangById,
    createBaigiang,
    updateBaigiang,
    deleteBaigiang,
    listBaiGiangByRange
};