const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bookController = require('../controllers/bookController');
const reviewController = require('../controllers/reviewController');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');
const { verifyToken, adminOnly } = require('../middlewares/authMiddleware');
const profanityFilter = require('../middlewares/profanityFilter');

// Auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Books & Trending
router.get('/trending', bookController.getTrending);

// Reviews
router.post('/reviews', verifyToken, profanityFilter, reviewController.createReview);
router.get('/reviews/public', reviewController.getPublicReviews);
router.get('/reviews/me', verifyToken, reviewController.getUserReviews);
router.post('/reviews/:reviewId/like', verifyToken, reviewController.toggleLike);
router.get('/reviews/liked', verifyToken, reviewController.getLikedReviews);
router.get('/reviews/my-liked-ids', verifyToken, reviewController.getMyLikedIds);

// Users
router.get('/users/search', userController.searchUsers);
router.get('/users/:userId', userController.getUserProfile);

// Admin
router.get('/admin/blocked', verifyToken, adminOnly, adminController.getBlockedReviews);
router.post('/admin/moderate', verifyToken, adminOnly, adminController.moderateReview);
router.get('/admin/users', verifyToken, adminOnly, adminController.getAllUsers);
router.post('/admin/ban', verifyToken, adminOnly, adminController.banUser);
router.delete('/admin/reviews/:reviewId', verifyToken, adminOnly, adminController.deleteReview);

module.exports = router;
