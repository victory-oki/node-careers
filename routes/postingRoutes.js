const router = require('express').Router();

const postingController = require('../controllers/postingController');
const authController = require('../controllers/authController');


router.route('/')
.get(authController.protect,postingController.getPostings)
.post(authController.protect, authController.restrictTo('admin', 'hr-lead', 'hr'), postingController.addPosting)
module.exports = router; 