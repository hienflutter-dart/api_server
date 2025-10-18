const express = require("express");
const router = express.Router();
const {
  getAllNhomhoc,
  getNhomhocByIdLop,
  addNhomhoc,
  updateNhomhoc,
  deleteNhomhoc,
  getNhomhocById,
} = require("../../controllers/lophoc_module_controllers/nhomhoc.controller");


// Định nghĩa các tuyến đường
router.get("/", getAllNhomhoc); // Lấy danh sách tất cả nhóm học
router.get("/lop/:id_lop", getNhomhocByIdLop); // Lấy danh sách nhóm của lớp
router.get("/:id", getNhomhocById); // Lấy nhóm theo ID
router.post("/", addNhomhoc); // Thêm nhóm
router.put("/:id", updateNhomhoc); // Cập nhật nhóm
router.delete("/:id", deleteNhomhoc); // Xóa nhóm



module.exports = router;
