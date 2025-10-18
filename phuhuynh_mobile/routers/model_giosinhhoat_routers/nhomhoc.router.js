const express = require('express');
const router = express.Router();
const nhomhocController = require('../../controllers/model_controllers_giosinhhoat/nhomhoc.controller');

router.get('/', nhomhocController.getAllNhomhoc);
router.get('/:id', nhomhocController.getNhomhocById);
router.get('/by-lop/:id_lop', nhomhocController.getNhomhocByIdLop);
router.post('/', nhomhocController.addNhomhoc);
router.put('/:id', nhomhocController.updateNhomhoc);
router.delete('/:id', nhomhocController.deleteNhomhoc);


module.exports = router;