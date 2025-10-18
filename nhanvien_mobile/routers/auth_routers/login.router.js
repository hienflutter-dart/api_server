const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/authcontrollers/login.controller');

// Đăng nhập bằng code 4 số
router.post('/login-code', ctrl.loginByCode);

// (để dành sau) đăng nhập user/pass
router.post('/login-userpass', ctrl.loginByUserPass); // tạm thời chưa dùng
router.put('/change-pass', ctrl.changePasswordByIdNv);


module.exports = router;
