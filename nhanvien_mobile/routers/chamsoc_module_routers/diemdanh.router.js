// routes/chamsoc_module/diemdanh.route.js
const express = require('express');
const router = express.Router();
const D = require('../../controllers/chamsoc_module_controller/diemdanh.controller');

// giáo viên (mỗi NV 1 nhóm)
router.get ("/nv/:id_nv/today",        D.listTodayByStaff);
router.get ("/nv/:id_nv",              D.listByStaffOnDate); // ?date=YYYY-MM-DD
router.post("/nv/:id_nv/init",         D.initTodayByStaff);
router.put ("/nv/:id_nv/:id_dem_danh", D.updateOneByStaff);

module.exports = router;
