const express = require('express');
const router = express.Router();
const phanboController = require('../../controllers/model_controllers_giosinhhoat/phanbo.controller');


router.get('/', phanboController.getAllPhanbo);
router.get('/:id', phanboController.getPhanboById);
router.get('/checkpb', phanboController.checkPhanBoByLop);
router.post('/', phanboController.createPhanbo);
router.put('/:id', phanboController.updatePhanbo);
router.delete('/:id', phanboController.deletePhanbo);

module.exports = router;