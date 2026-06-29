/**
 * Seed script - run with: node seed.js
 * Creates admin account + sample blogs + sample dermatologists
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/User');
const Blog = require('./models/Blog');
const Dermatologist = require('./models/Dermatologist');

const seedData = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({ role: 'admin' });
  await Blog.deleteMany({});
  await Dermatologist.deleteMany({});

  // Create admin
  await User.create({
    fullName: 'Admin SkinSense',
    email: 'admin@skinsense.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log('✅ Admin created: admin@skinsense.com / admin123');

  // Seed blogs
  await Blog.insertMany([
    {
      title: 'The Truth About Home Remedies',
      description: 'Are home remedies really safe for your skin? Find out the facts.',
      content:
        'Many people turn to home remedies for skin issues, but not all of them are safe or effective. Ingredients like lemon juice can cause chemical burns, while toothpaste can irritate sensitive skin. Always consult a dermatologist before trying DIY treatments. Evidence-based skincare is the safest approach for long-term skin health.',
      category: 'Skincare Tips',
    },
    {
      title: 'Why DIY Treatments Can Harm Your Skin',
      description: 'Learn why DIY skincare can sometimes do more harm than good.',
      content:
        'DIY skincare trends are everywhere on social media, but many of these treatments lack scientific backing. Mixing random kitchen ingredients can disrupt your skin barrier, cause allergic reactions, or worsen existing conditions. It is important to understand your skin type and use products formulated by dermatologists.',
      category: 'Skin Safety',
    },
    {
      title: 'Importance of Dermatologist-Approved Products',
      description: 'Why you should choose clinically tested skincare products.',
      content:
        'Dermatologist-approved products undergo rigorous testing to ensure they are safe and effective. These products are formulated with the right concentrations of active ingredients and are tested for skin compatibility. Choosing such products reduces the risk of irritation, breakouts, and long-term skin damage.',
      category: 'Product Guide',
    },
    {
      title: 'Daily Skincare Tips for Healthy Skin',
      description: 'Simple daily habits that can transform your skin.',
      content:
        'A consistent skincare routine is the foundation of healthy skin. Cleanse your face twice daily, moisturize, and never skip sunscreen. Stay hydrated, eat a balanced diet rich in antioxidants, and get enough sleep. Avoid touching your face frequently and change your pillowcase regularly.',
      category: 'Daily Care',
    },
    {
      title: 'Acne Care Guide: What Really Works',
      description: 'A comprehensive guide to managing and treating acne effectively.',
      content:
        'Acne is one of the most common skin conditions affecting people of all ages. Effective treatments include benzoyl peroxide, salicylic acid, and retinoids. Avoid over-washing your face as it can strip natural oils and worsen acne. A consistent routine, proper diet, and stress management are key to clear skin.',
      category: 'Acne',
    },
    {
      title: 'Understanding Your Skin Type',
      description: 'How to identify your skin type and care for it properly.',
      content:
        'Knowing your skin type is the first step to an effective skincare routine. The main skin types are dry, oily, combination, and sensitive. Dry skin needs rich moisturizers, oily skin benefits from lightweight gel formulas, combination skin requires a balanced approach, and sensitive skin needs fragrance-free gentle products.',
      category: 'Skin Types',
    },
  ]);
  console.log('✅ Blogs seeded');

  // Seed dermatologists
  await Dermatologist.insertMany([
    {
      name: 'Dr. Ayesha Khan',
      specialization: 'Dermatology & Cosmetology',
      clinicName: 'Skin Care Clinic Lahore',
      phone: '+92-300-1234567',
      location: 'Gulberg III, Lahore',
      description:
        'Dr. Ayesha Khan is a board-certified dermatologist with over 10 years of experience in treating acne, eczema, and cosmetic skin procedures.',
      experience: '10+ years',
    },
    {
      name: 'Dr. Bilal Ahmed',
      specialization: 'Clinical Dermatology',
      clinicName: 'DermaCare Center Karachi',
      phone: '+92-321-9876543',
      location: 'DHA Phase 5, Karachi',
      description:
        'Dr. Bilal Ahmed specializes in clinical dermatology with expertise in psoriasis, vitiligo, and skin cancer screening.',
      experience: '8 years',
    },
    {
      name: 'Dr. Sara Malik',
      specialization: 'Pediatric & Adult Dermatology',
      clinicName: 'Glow Skin Clinic Islamabad',
      phone: '+92-333-5556677',
      location: 'F-7 Markaz, Islamabad',
      description:
        'Dr. Sara Malik is known for her gentle approach to treating sensitive skin conditions in both children and adults.',
      experience: '12 years',
    },
    {
      name: 'Dr. Usman Tariq',
      specialization: 'Aesthetic Dermatology',
      clinicName: 'Radiance Skin Studio',
      phone: '+92-345-7778899',
      location: 'Model Town, Lahore',
      description:
        'Dr. Usman Tariq focuses on aesthetic dermatology including laser treatments, chemical peels, and anti-aging procedures.',
      experience: '7 years',
    },
  ]);
  console.log('✅ Dermatologists seeded');

  console.log('\n🌸 Seed complete! You can now start the server.');
  process.exit(0);
};

seedData().catch((err) => {
  console.error(err);
  process.exit(1);
});
