const express = require('express');
const router = express.Router();
const tc_lopnkController = require('../../controllers/model_controllers_giosinhhoat/tc_lopnk.controller');


router.get('/', tc_lopnkController.getAllTc_lopnk);
router.get('/:id', tc_lopnkController.getTc_lopnkById);
router.post('/', tc_lopnkController.createTc_lopnk);
router.put('/:id', tc_lopnkController.updateTc_lopnk);
router.delete('/:id', tc_lopnkController.deleteTc_lopnk);

module.exports = router;