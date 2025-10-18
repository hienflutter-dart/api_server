const { query } = require('../../../config/db');

// Lấy tất cả

async function getAllGioSinhHoat(req, res) {
  try {
    const results = await query(`
      SELECT g.id_gio_sinh_hoat, g.id_lop, g.id_hoat_dong, 
             g.gio_bat_dau, g.gio_ket_thuc,
             l.ten_lop, h.ten_hoat_dong
      FROM giosinhhoat g
      LEFT JOIN lophoc l ON g.id_lop = l.id_lop
      LEFT JOIN hoatdong h ON g.id_hoat_dong = h.id_hoat_dong
    `);
    res.json(results);
  } catch (err) {
    console.error('❌ Lỗi truy vấn toàn bộ giosinhhoat:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

// Lấy 1 theo id
async function getGioSinhHoatById(req, res) {
  const { id } = req.params;
  try {
    const results = await query(
      `SELECT g.*, l.ten_lop, h.ten_hoat_dong
       FROM giosinhhoat g
       LEFT JOIN lophoc l ON g.id_lop = l.id_lop
       LEFT JOIN hoatdong h ON g.id_hoat_dong = h.id_hoat_dong
       WHERE g.id_gio_sinh_hoat = ?`,
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy giờ sinh hoạt' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error(`❌ Lỗi truy vấn giosinhhoat id=${id}:`, err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

// Thêm mới
async function createGioSinhHoat(req, res) {
  const { id_lop, id_hoat_dong, gio_bat_dau, gio_ket_thuc } = req.body;
  try {
    if (!id_lop || !id_hoat_dong || !gio_bat_dau || !gio_ket_thuc) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const result = await query(
      `INSERT INTO giosinhhoat (id_lop, id_hoat_dong, gio_bat_dau, gio_ket_thuc)
       VALUES (?, ?, ?, ?)`,
      [id_lop, id_hoat_dong, gio_bat_dau, gio_ket_thuc]
    );

    const [newRow] = await query(
      `SELECT g.*, l.ten_lop, h.ten_hoat_dong
       FROM giosinhhoat g
       LEFT JOIN lophoc l ON g.id_lop = l.id_lop
       LEFT JOIN hoatdong h ON g.id_hoat_dong = h.id_hoat_dong
       WHERE g.id_gio_sinh_hoat = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: 'Thêm giờ sinh hoạt thành công', data: newRow });
  } catch (err) {
    console.error('❌ Lỗi thêm giosinhhoat:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

// Cập nhật
async function updateGioSinhHoat(req, res) {
  const { id } = req.params;
  const { id_lop, id_hoat_dong, gio_bat_dau, gio_ket_thuc } = req.body;
  try {
    const result = await query(
      `UPDATE giosinhhoat
       SET id_lop=?, id_hoat_dong=?, gio_bat_dau=?, gio_ket_thuc=?
       WHERE id_gio_sinh_hoat=?`,
      [id_lop, id_hoat_dong, gio_bat_dau, gio_ket_thuc, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy giờ sinh hoạt để cập nhật' });
    }

    const [updated] = await query(
      `SELECT g.*, l.ten_lop, h.ten_hoat_dong
       FROM giosinhhoat g
       LEFT JOIN lophoc l ON g.id_lop = l.id_lop
       LEFT JOIN hoatdong h ON g.id_hoat_dong = h.id_hoat_dong
       WHERE g.id_gio_sinh_hoat = ?`,
      [id]
    );

    res.json({ message: 'Cập nhật giờ sinh hoạt thành công', data: updated });
  } catch (err) {
    console.error(`❌ Lỗi cập nhật giosinhhoat id=${id}:`, err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

// Xóa
async function deleteGioSinhHoat(req, res) {
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM giosinhhoat WHERE id_gio_sinh_hoat = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy giờ sinh hoạt để xóa' });
    }

    res.json({ message: 'Xóa giờ sinh hoạt thành công' });
  } catch (err) {
    console.error(`❌ Lỗi xóa giosinhhoat id=${id}:`, err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

module.exports = {
  getAllGioSinhHoat,
  getGioSinhHoatById,
  createGioSinhHoat,
  updateGioSinhHoat,
  deleteGioSinhHoat,
};
