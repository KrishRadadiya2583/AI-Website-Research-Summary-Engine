const express = require('express');
const router = express.Router();
const urlvalidator = require('../middlewares/urlvalidator')


const { index, research } = require('../controllers/researchcontroller');

router.get('/', index);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', database: require('../config/db').isConnected() ? 'connected' : 'disabled' });
});

router.post('/research', urlvalidator, research);

module.exports = router;
