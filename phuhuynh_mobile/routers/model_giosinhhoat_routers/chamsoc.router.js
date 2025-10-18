// routes/chamSoc.routes.js
const router = require('express').Router();
const ctrl = require("../../controllers/model_controllers_giosinhhoat/chamsoc.controller");

// Danh sách / tra cứu
router.get('/', ctrl.list);
router.get('/', ctrl.getOneByChildDate);

// Lưu dữ liệu
router.post('/upsert', ctrl.upsert);
router.post('/bulk', ctrl.bulkUpsert);

module.exports = router;
