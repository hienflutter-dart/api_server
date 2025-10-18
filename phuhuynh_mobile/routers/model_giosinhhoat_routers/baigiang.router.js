const express = require('express');
const router = express.Router();
const baigiangController = require('../../controllers/model_controllers_giosinhhoat/baigiang.controller');

router.get('/range', baigiangController.listBaiGiangByRange);

router.get('/', baigiangController.getAllBaigiang);
router.get('/:id', baigiangController.getBaigiangById);
router.post('/', baigiangController.createBaigiang);
router.put('/:id', baigiangController.updateBaigiang);
router.delete('/:id', baigiangController.deleteBaigiang);

module.exports = router;
