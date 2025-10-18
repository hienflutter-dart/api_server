const express = require('express');
const router = express.Router();
const lophocController = require('../../controllers/model_controllers_giosinhhoat/lophoc.controller');

router.get('/', lophocController.getAllLophoc);
router.get('/:id', lophocController.getLophocById);
router.get('/getlopbytre/:id', lophocController.getlopbytre);

router.post('/', lophocController.addLophoc);

router.put('/:id', lophocController.updateLophoc);

router.delete('/:id', lophocController.deleteLophoc);


module.exports = router;