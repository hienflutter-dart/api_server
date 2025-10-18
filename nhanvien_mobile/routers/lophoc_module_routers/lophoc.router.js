const express = require("express");
const router = express.Router();
const {
  getAllLophoc,
  getLophocById,
  addLophoc,
  updateLophoc,
  deleteLophoc
} = require("../../controllers/lophoc_module_controllers/lophoc.controller");
const { getLopOverview } = require("../../controllers/lophoc_module_controllers/lophoc_overview.controller");

// Định nghĩa các tuyến đường cho lớp học
router.get("/", getAllLophoc); // Lấy danh sách tất cả lớp học
router.get("/:id", getLophocById); // Lấy thông tin một lớp học theo ID
router.post("/", addLophoc); // Thêm mới lớp học
router.put("/:id", updateLophoc); // Cập nhật thông tin lớp học
router.delete("/:id", deleteLophoc); // Xóa lớp học

// Full thong tin lớp học
router.get("/:id/overview", getLopOverview);


module.exports = router;
