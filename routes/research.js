const express = require('express');
const router = express.Router();
const urlvalidator = require('../middlewares/urlvalidator')


const { index, research } = require('../controllers/researchcontroller');

router.get('/', index);

router.post('/research', urlvalidator, research);

module.exports = router;