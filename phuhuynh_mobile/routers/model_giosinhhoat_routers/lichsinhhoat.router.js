const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/model_controllers_giosinhhoat/lichsinhhoat.controller');

// GET /api/lichsinhhoat/lop/:ma_lop?ngay=YYYY-MM-DD
router.get('/lop/:id_lop', ctrl.getLichSinhHoatByLop);


const lshGen = require('../../controllers/model_controllers_giosinhhoat/lichsinhhoat.generate.controller');

router.post('/generate', lshGen.generateLichSinhHoat);
router.get('/check', lshGen.checkLichSinhHoat);
router.get('/checkthucdon', lshGen.checkThucDonInRange);
// (các CRUD khác cho lichsinhhoat bạn đã có thì giữ nguyên)

module.exports = router;
