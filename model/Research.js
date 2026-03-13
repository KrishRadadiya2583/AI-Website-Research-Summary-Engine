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
  description: {
    type: String
  },
  fevicon: {
    type: String
  },
  summary: {
    type: String
  },

  readingTime: {
    type: String
  },


}, { timestamps: true });

module.exports = mongoose.model("Research", researchSchema);