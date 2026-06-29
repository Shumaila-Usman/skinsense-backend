const mongoose = require('mongoose');

const dermatologistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Dermatologist name is required'],
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
    },
    clinicName: {
      type: String,
      required: [true, 'Clinic name is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
    },
    description: {
      type: String,
      default: '',
    },
    experience: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: 'doctor_placeholder.jpg',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dermatologist', dermatologistSchema);
