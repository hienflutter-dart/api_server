const express = require("express");
const router = express.Router();
const {
  getAllPhancong,
  getPhancongById,
  getPhancongByIdNhanVien,
  addPhancong,
  updatePhancong,
  deletePhancong
} = require("../../controllers/nhanvien_module_controller/phancong.controller");

router.get("/", getAllPhancong);
router.get("/:idnhanvien", getPhancongByIdNhanVien); // Lấy danh sách phân công theo id nhân viên
router.get("/:idphancong", getPhancongById); // Lấy thông tin một phân công theo ID
router.post("/", addPhancong); // Thêm mới phân công
router.put("/:idphancong", updatePhancong); // Cập nhật thông tin phân công
router.delete("/:idphancong", deletePhancong); // Xóa phân công

module.exports = router;
