// app_routes.js
const express = require('express');
const router = express.Router();


const lophocRoutes = require('./routers/model_giosinhhoat_routers/lophoc.router');
const nhomhocRoutes = require('./routers/model_giosinhhoat_routers/nhomhoc.router');
const xeplophocRoutes = require('./routers/model_giosinhhoat_routers/xeplophoc.router');
const treemRouters = require('./routers/model_giosinhhoat_routers/treem.router');
const phuhuynhRouters = require('./routers/model_giosinhhoat_routers/phuhuynh.router');
const xeplopnkRouters = require('./routers/model_giosinhhoat_routers/tc_xeplopnk.router');
const lichsinhhoatRouters = require('./routers/model_giosinhhoat_routers/lichsinhhoat.router');
const lopnkRouters = require('./routers/model_giosinhhoat_routers/tc_lopnk.router');
const baigiangRouters = require('./routers/model_giosinhhoat_routers/baigiang.router');
const phanboRouters = require('./routers/model_giosinhhoat_routers/phanbo.router');
const hoatdongRouters = require('./routers/model_giosinhhoat_routers/hoatdong.router');
const chudeRouters = require('./routers/model_giosinhhoat_routers/chude.router');
const giosinhhoatRouters = require('./routers/model_giosinhhoat_routers/giosinhhoat.router');
const candoRouters = require('./routers/model_giosinhhoat_routers/cando.router');
const msgRouters = require('./routers/model_giosinhhoat_routers/msg_login.router');
const chamsocRouters = require('./routers/model_giosinhhoat_routers/chamsoc.router');
const khuonmatRouters = require('./routers/model_giosinhhoat_routers/khuonmat.router');
const nhanVienRoutes = require('./routers/model_giosinhhoat_routers/nhanvien.router');
// Sử dụng router
router.use('/lichsinhhoat', lichsinhhoatRouters);
router.use('/lophoc', lophocRoutes);
router.use('/nhomhoc', nhomhocRoutes);
router.use('/xeplophoc', xeplophocRoutes);
router.use('/treem', treemRouters);
router.use('/phuhuynh', phuhuynhRouters);
router.use('/xeplopnk', xeplopnkRouters);
router.use('/tc_lopnk', lopnkRouters);
router.use('/baigiang', baigiangRouters);
router.use('/phanbo', phanboRouters);
router.use('/hoatdong', hoatdongRouters);
router.use('/chude', chudeRouters);
router.use('/giosinhhoat', giosinhhoatRouters);
router.use('/cando', candoRouters);
router.use('/msg-login', msgRouters);
router.use('/chamsoc', chamsocRouters);
router.use('/khuonmat', khuonmatRouters);
router.use('/nhanvien', nhanVienRoutes);

module.exports = router;
