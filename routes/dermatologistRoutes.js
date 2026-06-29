const express = require('express');
const router = express.Router();
const {
  getAllDermatologists,
  getDermatologistById,
  createDermatologist,
  updateDermatologist,
  deleteDermatologist,
} = require('../controllers/dermatologistController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getAllDermatologists);
router.get('/:id', getDermatologistById);
router.post('/', protect, adminOnly, createDermatologist);
router.put('/:id', protect, adminOnly, updateDermatologist);
router.delete('/:id', protect, adminOnly, deleteDermatologist);

module.exports = router;
