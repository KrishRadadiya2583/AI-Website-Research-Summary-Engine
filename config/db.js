const mongoose = require('mongoose');

const state = { connected: false, error: null };

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast instead of buffering
      connectTimeoutMS: 5000,
    });
    state.connected = true;
  } catch (err) {
    state.error = err;
  }

  mongoose.connection.on('disconnected', () => {
    state.connected = false;
  });
  mongoose.connection.on('reconnected', () => {
    state.connected = true;
  });
}

function isConnected() {
  return state.connected && mongoose.connection.readyState === 1;
}

module.exports = connectDB;
module.exports.isConnected = isConnected;
