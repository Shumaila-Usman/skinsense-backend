const Dermatologist = require('../models/Dermatologist');

// @desc    Get all dermatologists
// @route   GET /api/dermatologists
// @access  Public
const getAllDermatologists = async (req, res) => {
  try {
    const dermatologists = await Dermatologist.find().sort({ createdAt: -1 });
    res.json(dermatologists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single dermatologist
// @route   GET /api/dermatologists/:id
// @access  Public
const getDermatologistById = async (req, res) => {
  try {
    const dermatologist = await Dermatologist.findById(req.params.id);
    if (!dermatologist) {
      return res.status(404).json({ message: 'Dermatologist not found' });
    }
    res.json(dermatologist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create dermatologist
// @route   POST /api/dermatologists
// @access  Admin
const createDermatologist = async (req, res) => {
  try {
    const { name, specialization, clinicName, phone, location, description, experience } =
      req.body;

    if (!name || !specialization || !clinicName || !phone || !location) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const dermatologist = await Dermatologist.create({
      name,
      specialization,
      clinicName,
      phone,
      location,
      description,
      experience,
    });
    res.status(201).json(dermatologist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update dermatologist
// @route   PUT /api/dermatologists/:id
// @access  Admin
const updateDermatologist = async (req, res) => {
  try {
    const dermatologist = await Dermatologist.findById(req.params.id);
    if (!dermatologist) {
      return res.status(404).json({ message: 'Dermatologist not found' });
    }

    const { name, specialization, clinicName, phone, location, description, experience } =
      req.body;

    dermatologist.name = name || dermatologist.name;
    dermatologist.specialization = specialization || dermatologist.specialization;
    dermatologist.clinicName = clinicName || dermatologist.clinicName;
    dermatologist.phone = phone || dermatologist.phone;
    dermatologist.location = location || dermatologist.location;
    dermatologist.description = description || dermatologist.description;
    dermatologist.experience = experience || dermatologist.experience;

    const updated = await dermatologist.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete dermatologist
// @route   DELETE /api/dermatologists/:id
// @access  Admin
const deleteDermatologist = async (req, res) => {
  try {
    const dermatologist = await Dermatologist.findById(req.params.id);
    if (!dermatologist) {
      return res.status(404).json({ message: 'Dermatologist not found' });
    }
    await dermatologist.deleteOne();
    res.json({ message: 'Dermatologist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllDermatologists,
  getDermatologistById,
  createDermatologist,
  updateDermatologist,
  deleteDermatologist,
};
