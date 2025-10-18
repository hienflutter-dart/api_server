const express = require("express");
const router = express.Router();
const luongController = require("../../controllers/nhanvien_module_controller/luong.controller");

router.get("/:id_nv", luongController.getLuongByIdNV);

module.exports = router;