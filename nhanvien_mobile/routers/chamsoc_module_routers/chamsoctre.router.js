// routes/module_chamsoc_routes/chamsoctre.routes.js
const express = require("express");
const router = express.Router();
const c = require("../../controllers/chamsoc_module_controller/chamsoctre.controller");

// LẤY DỮ LIỆU
router.get("/lydovang", c.getAllLyDoVang);
router.get("/:id", c.getChamSocTreById);                     // 1 bản ghi
router.get("/tre/:id_tre_em", c.getChamSocTreByTreEm);       // theo trẻ
router.get("/nv/:id_nv", c.getChamSocTreByNV);               // theo nhân viên
router.get("/lop/:id_lop/today", c.getChamSocTreTodayByLop); // lớp trong ngày nghiệp vụ

// GHI DỮ LIỆU
router.post("/", c.insertChamSocTre);
router.delete("/:id", c.deleteChamSocTre);

module.exports = router;
