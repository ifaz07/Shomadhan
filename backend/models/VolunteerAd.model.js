const mongoose = require('mongoose');

const volunteerAdSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    posterUrl: {
      type: String,
      required: [true, 'Poster image URL is required'],
    },
    dateOfEvent: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    requiredVolunteers: {
      type: Number,
      required: [true, 'Number of required volunteers is required'],
      min: [1, 'Must require at least 1 volunteer'],
    },
    contactDetails: {
      type: String,
      required: [true, 'Contact details are required for manual registration'],
      trim: true,
    },
    registeredVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VolunteerAd', volunteerAdSchema);
