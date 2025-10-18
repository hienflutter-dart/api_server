const express = require('express');
const router = express.Router();

const ctrl = require('../../controllers/model_controllers_giosinhhoat/msg_login.controller');

router.post('/insert', ctrl.insertMsgLogin);          // tạo record khi open/login app
router.post('/update', ctrl.updateMsgLogoutOrClose);  // cập nhật time_out khi close/logout
router.post('/track', ctrl.trackMsgLogin);            // upsert 1-chạm (open/login/close/logout)

module.exports = router;
