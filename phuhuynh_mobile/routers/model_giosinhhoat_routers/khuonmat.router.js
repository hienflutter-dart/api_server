const express = require('express');
const router = express.Router();
const faceController = require('../../controllers/model_controllers_giosinhhoat/khuonmat.controller');

// Đăng ký khuôn mặt
router.post('/register', faceController.registerFace);

// Nhận diện khuôn mặt
router.post('/recognize', faceController.recognizeFace);

router.post('/initAttendance', faceController.initAttendance);

module.exports = router;
