const express = require('express');
const router = express.Router();
const ccnvController = require('../../controllers/nhanvien_module_controller/ccnv.controller');

router.get('/:id_nv', ccnvController.getALLCCNVByIdNV);

module.exports = router;