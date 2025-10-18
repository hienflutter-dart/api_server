const express = require('express');
const router = express.Router();
const phuhuynhController = require('../../controllers/model_controllers_giosinhhoat/phuhuynh.controller');

router.post('/login-phu-huynh', phuhuynhController.loginPhuHuynh);
router.get('/:id_phu_huynh/tre-em', phuhuynhController.getTreEmByPhuHuynh);
router.post('/tre-em/by-ids', phuhuynhController.getTreEmByIds);

module.exports = router;

