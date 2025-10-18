// app_routes.js
const express = require('express');
const router = express.Router();

// import từng nhóm route

const treemimagesRoutes = require('./routers/chamsoc_module_routers/treem_images.router');
const phanhoiRoutes = require('./routers/chamsoc_module_routers/phanhoi.router');
const loinhanRoutes = require('./routers/chamsoc_module_routers/loinhan.router');
const loaiPhanHoiRoutes = require('./routers/chamsoc_module_routers/loaiphanhoi.router');
const candoRoutes = require('./routers/chamsoc_module_routers/cando.router');
const chamsocRoutes = require('./routers/chamsoc_module_routers/chamsoc.router');
const chamsoctreRoutes = require('./routers/chamsoc_module_routers/chamsoctre.router');
const lydovangRoutes = require('./routers/chamsoc_module_routers/lydovang.router');

const diemdanhRoutes = require('./routers/chamsoc_module_routers/diemdanh.router');

///các routes lớp học
const lopHocRoutes = require('./routers/lophoc_module_routers/lophoc.router');
const nhomHocRoutes = require('./routers/lophoc_module_routers/nhomhoc.router');
const treemRoutes = require('./routers/lophoc_module_routers/treem.router');
const lichsinhhoatRoutes = require('./routers/lophoc_module_routers/lichsinhhoat.router');

///các routes nhân viên
const nhanVienRoutes = require('./routers/nhanvien_module_routers/nhanvien.router');
const phancongRoutes = require('./routers/nhanvien_module_routers/phancong.router');
const ccnvRoutes = require('./routers/nhanvien_module_routers/ccnv.router');
const luongRoutes = require('./routers/nhanvien_module_routers/luong.router');

/// auth routes
const authRoutes = require('./routers/auth_routers/login.router');
const indexcountRoutes = require('./routers/auth_routers/indexcount.router');



// gán prefix cho từng nhóm
router.use('/auth', authRoutes);
router.use('/indexcount', indexcountRoutes);


router.use('/treem', treemRoutes);
router.use('/treemimages', treemimagesRoutes);
router.use('/phanhoi', phanhoiRoutes); 
router.use('/loinhan', loinhanRoutes);
router.use('/loaiphanhoi', loaiPhanHoiRoutes);
router.use('/cando', candoRoutes);
router.use('/chamsoc', chamsocRoutes);
router.use('/chamsoctre', chamsoctreRoutes);
router.use('/lydovang', lydovangRoutes);

router.use('/diemdanh', diemdanhRoutes);
router.use('/lichsinhhoat', lichsinhhoatRoutes);


router.use('/lophoc', lopHocRoutes);
router.use('/nhomhoc', nhomHocRoutes);
router.use('/nhanvien', nhanVienRoutes);
router.use('/phancong', phancongRoutes);
router.use('/chamcong', ccnvRoutes);
router.use('/luong', luongRoutes);


// export router đã gắn tất cả route
module.exports = router;
