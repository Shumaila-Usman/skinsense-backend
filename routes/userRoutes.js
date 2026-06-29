const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, deleteUser, getProfile } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.get('/', protect, adminOnly, getAllUsers);
router.get('/:id', protect, adminOnly, getUserById);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
