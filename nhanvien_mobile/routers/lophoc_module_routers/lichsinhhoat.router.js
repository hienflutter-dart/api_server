const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/lophoc_module_controllers/lichsinhhoat.controller');

// GET /api/lichsinhhoat/lop/:ma_lop?ngay=YYYY-MM-DD
router.get('/lop/:id_lop', ctrl.getLichSinhHoatByLop);

// (các CRUD khác cho lichsinhhoat bạn đã có thì giữ nguyên)
module.exports = router;
