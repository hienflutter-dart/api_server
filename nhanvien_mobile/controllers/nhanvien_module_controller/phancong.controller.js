const {query} = require("../../../config/db");


const getAllPhancong = async (req, res) => {
  try {
    const phancongs = await query("SELECT * FROM phancong");

    if (phancongs.length > 0) {
      res.json(phancongs); // Trả về toàn bộ danh sách phân công
    } else {
      res.status(404).send("Không có dữ liệu phân công nào");
    }
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};


const getPhancongByIdNhanVien = async (req, res) => {
  try {
    const { id_nv } = req.params;
    if (!Number.isInteger(Number(id_nv))) {
      return res.status(400).send("ID nhân viên không hợp lệ");
    }
    const phancongs = await query("SELECT * FROM phancong WHERE id_nv = ?", [id_nv]);
    
    if (phancongs.length > 0) {
      res.json(phancongs); // Trả về danh sách các phân công
    } else {
      res.status(404).send("Không tìm thấy phân công nào cho nhân viên này");
    }
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};

const getPhancongById = async (req, res) => {
  try {
    const { id_pc } = req.params;
    if (!Number.isInteger(Number(id_pc))) {
      return res.status(400).send("ID phân công không hợp lệ");
    }
    const phancong = await query("SELECT * FROM phancong WHERE id_pc = ?", [id_pc]);

    if (phancong.length > 0) {
      res.json(phancong[0]);
    } else {
      res.status(404).send("Không tìm thấy phân công");
    }
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).send("Lỗi khi truy vấn dữ liệu");
  }
};

const addPhancong = async (req, res) => {
  try {
    const { id_nv, id_nhom_hoc, ngay_bat_dau, val } = req.body;
    const result = await query(
      "INSERT INTO phancong (id_nv, id_nhom_hoc, ngay_bat_dau, val) VALUES (?, ?, ?, ?)",
      [id_nv, id_nhom_hoc, ngay_bat_dau, val]
    );
    res.status(201).json({ message: "Phân công đã được thêm", id: result.insertId });
  } catch (err) {
    res.status(500).send("Lỗi khi thêm phân công");
  }
};

const updatePhancong = async (req, res) => {
  try {
    const { id_pc } = req.params;
    const { id_nv, id_nhom_hoc, ngay_bat_dau, val } = req.body;
    const result = await query(
      "UPDATE phancong SET id_nv = ?, id_nhom_hoc = ?, ngay_bat_dau = ?, val = ? WHERE id_pc = ?",
      [id_nv, id_nhom_hoc, ngay_bat_dau, val, id_pc]
    );

    if (result.affectedRows > 0) {
      res.json({ message: "Phân công đã được cập nhật" });
    } else {
      res.status(404).send("Không tìm thấy phân công để cập nhật");
    }
  } catch (err) {
    res.status(500).send("Lỗi khi cập nhật phân công");
  }
};

const deletePhancong = async (req, res) => {
  try {
    const { id_pc } = req.params;
    const result = await query("DELETE FROM phancong WHERE id_pc = ?", [id_pc]);

    if (result.affectedRows > 0) {
      res.json({ message: "Phân công đã được xóa" });
    } else {
      res.status(404).send("Không tìm thấy phân công để xóa");
    }
  } catch (err) {
    res.status(500).send("Lỗi khi xóa phân công");
  }
};

module.exports = { getAllPhancong ,getPhancongByIdNhanVien, getPhancongById, addPhancong, updatePhancong, deletePhancong };