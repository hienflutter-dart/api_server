// routes/chamsoc_module/chamsoc.routes.js
const express = require('express');
const router = express.Router();
const CS = require('../../controllers/chamsoc_module_controller/chamsoc.controller');

// Giáo viên (mỗi NV 1 nhóm):
router.get ("/nv/:id_nv/today", CS.listTodayByStaff);
router.get ("/nv/:id_nv",       CS.listByStaffOnDate); // ?date=YYYY-MM-DD
router.post("/nv/:id_nv/init",  CS.initTodayByStaff);
router.put ("/nv/:id_nv/:id_cs",CS.updateOneByStaff);
router.get("/tre/:id_tre_em",   CS.getCamXucByIdTre);

module.exports = router;
