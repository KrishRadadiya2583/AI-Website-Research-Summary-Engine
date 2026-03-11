const mongoose = require("mongoose");

const researchSchema = new mongoose.Schema({

  url: {
    type: String,
    required: true,
    unique: true
  },

  title: {
    type: String
  },

  summary: {
    type: String
  },

  key_points: {
    type: [String]
  },

  reading_time: {
    type: String
  },


}, { timestamps: true });

module.exports = mongoose.model("Research", researchSchema);