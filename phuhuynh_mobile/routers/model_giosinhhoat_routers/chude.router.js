const express = require('express');
const router = express.Router();
const chudeController = require('../../controllers/model_controllers_giosinhhoat/chude.controller');


router.get('/', chudeController.getAllChude);
router.get('/:id', chudeController.getChudeById);
router.post('/', chudeController.createChude);
router.put('/:id', chudeController.updateChude);
router.delete('/:id', chudeController.deleteChude);

module.exports = router;