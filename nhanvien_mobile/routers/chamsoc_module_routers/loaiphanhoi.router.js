// routes/module_chamsoc_routes/loaiphanhoi.routes.js
const express = require('express');
const router = express.Router();
const {
  getLoaiPhanHoi,
} = require("../../controllers/chamsoc_module_controller/loaiphanhoi.controller");

// Lấy tất cả loại phản hồi
router.get('/', getLoaiPhanHoi);


module.exports = router;
