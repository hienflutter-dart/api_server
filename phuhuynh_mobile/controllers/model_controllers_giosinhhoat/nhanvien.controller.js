const {query} = require('../../../config/db');

const getAllNhanvien = async (req, res) => {
  try {
    console.log("📋 getAllNhanvien");

    const nhanviens = await query(`
      SELECT 
        id_nv,
        ho_ten,
        gioi_tinh,
        ngay_sinh,
        dia_chi,
        so_dien_thoai,
        ngay_vao_lam,
        id_phan_loai,
        id_trinh_do,
        trang_thai
      FROM nhanvien
      WHERE trang_thai = 1
      ORDER BY id_nv ASC
    `);

    if (nhanviens.length === 0) {
      return res.status(404).json({ message: "Không có nhân viên đang hoạt động (trạng thái = 1)" });
    }

    res.json(nhanviens);
  } catch (err) {
    console.error("❌ Lỗi getAllNhanvien:", err);
    res.status(500).send("Lỗi khi lấy danh sách nhân viên");
  }
};


const getNhanvienById = async (req, res) => {
  try {
    console.log("getNhanvienById: ", req.params.id_nv);
    const { id_nv } = req.params;
    const nhanvien = await query("SELECT * FROM nhanvien WHERE id_nv = ?", [id_nv]);

    if (nhanvien.length > 0) {
      res.json(nhanvien[0]);
    } else {
      res.status(404).send("Không tìm thấy nhân viên");
    }
  } catch (err) {
    res.status(500).send("No data select");
  }
};



const updateNhanvien = async (req, res) => {
  try {
    const { id_nv } = req.params;
    const { ho_ten, gioi_tinh, ngay_sinh, dia_chi, so_dien_thoai, ngay_vao_lam, id_phan_loai, id_trinh_do, trang_thai } = req.body;
    const result = await query(
      "UPDATE nhanvien SET ho_ten = ?, gioi_tinh = ?, ngay_sinh = ?, dia_chi = ?, so_dien_thoai = ?, ngay_vao_lam = ?, id_phan_loai = ?, id_trinh_do = ?, trang_thai = ? WHERE id_nv = ?",
      [ho_ten, gioi_tinh, ngay_sinh, dia_chi, so_dien_thoai, ngay_vao_lam, id_phan_loai, id_trinh_do, trang_thai, id_nv]
    );

    if (result.affectedRows > 0) {
      res.json({ message: "Nhân viên đã được cập nhật" });
    } else {
      res.status(404).send("Không tìm thấy nhân viên để cập nhật");
    }
  } catch (err) {
    res.status(500).send("Lỗi khi cập nhật nhân viên");
  }
};

const updateNhanvienSelf = async (req, res) => {
  try {
    const { id_nv } = req.params;
    const { ngay_sinh, dia_chi, so_dien_thoai } = req.body || {};

    const sets = [];
    const params = [];

    // validate & build SET
    if (ngay_sinh !== undefined) {
      const d = new Date(ngay_sinh);
      if (isNaN(d.getTime()))
        return res.status(400).json({ message: 'ngay_sinh không hợp lệ' });
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      sets.push('ngay_sinh = ?');
      params.push(`${y}-${m}-${day}`); // YYYY-MM-DD
    }

    if (dia_chi !== undefined) {
      sets.push('dia_chi = ?');
      params.push(String(dia_chi).trim());
    }

    if (so_dien_thoai !== undefined) {
      const phone = String(so_dien_thoai).replace(/[^\d+]/g, '');
      if (!/^\+?\d{9,15}$/.test(phone))
        return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
      sets.push('so_dien_thoai = ?');
      params.push(phone);
    }

    if (!sets.length) {
      return res.status(400).json({ message: 'Không có gì để cập nhật' });
    }

    params.push(id_nv);

    const result = await query(
      `UPDATE nhanvien SET ${sets.join(', ')} WHERE id_nv = ?`,
      params
    );

    if (!result.affectedRows) {
      return res.status(404).send('Không tìm thấy nhân viên để cập nhật');
    }

    const updated = await query(
      'SELECT id_nv, ho_ten, gioi_tinh, ngay_sinh, dia_chi, so_dien_thoai, ngay_vao_lam, id_phan_loai, id_trinh_do, trang_thai FROM nhanvien WHERE id_nv = ?',
      [id_nv]
    );

    res.json({ message: 'Cập nhật thành công', data: updated[0] });
    console.log('Nhân viên đã tự cập nhật thông tin:', id_nv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi cập nhật nhân viên');
  }
};




module.exports = {  getNhanvienById, updateNhanvien,updateNhanvienSelf, getAllNhanvien };