const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Blog description is required'],
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
    },
    image: {
      type: String,
      default: 'blog_placeholder.jpg',
    },
    category: {
      type: String,
      default: 'Skincare',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
