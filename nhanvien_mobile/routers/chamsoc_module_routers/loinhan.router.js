// routes/module_chamsoc_routes/loinhan.routes.js
const express = require("express");
const router = express.Router();
const {
  getLoiNhan,
  getLoiNhanById,
  getLoiNhanByTreEm,
  insertLoiNhan,
  updateLoiNhan,
  deleteLoiNhan,
  khoitaoLoiNhan,
  guiLoiNhan,
  getLoiNhanTodayByLop,
} = require("../../controllers/chamsoc_module_controller/loinhan.controller");

// Lấy tất cả lời nhắn
router.get("/", getLoiNhan);
router.get("/:id", getLoiNhanById);
// Lấy lời nhắn theo ID trẻ em
router.get("/tre/:id_tre_em", getLoiNhanByTreEm);
router.post("/", insertLoiNhan);
router.put("/:id", updateLoiNhan);
router.delete("/:id", deleteLoiNhan);

// Tạo/bổ sung lô 10 phiếu trống cho 1 trẻ
router.post("/init-loinhan", khoitaoLoiNhan);
// Gửi lời nhắn (tiêu thụ 1 slot trống + set NOW)
router.post("/send", guiLoiNhan);
// Lấy lời nhắn hôm nay theo lớp
router.get("/today/:id_lop", getLoiNhanTodayByLop);

module.exports = router;
