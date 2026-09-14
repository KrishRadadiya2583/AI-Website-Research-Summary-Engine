const mongoose = require('mongoose');
const logger = require('../utils/logger');

const state = { connected: false, error: null, enabled: false, listenersBound: false };

function bindConnectionListeners() {
  if (state.listenersBound) return;
  state.listenersBound = true;

  mongoose.connection.on('disconnected', () => {
    state.connected = false;
    logger.warn('MongoDB disconnected; cache unavailable until reconnects');
  });

  mongoose.connection.on('reconnected', () => {
    state.connected = true;
    state.error = null;
    logger.info('MongoDB reconnected; cache restored');
  });
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  bindConnectionListeners();

  if (!uri) {
    logger.info('MongoDB disabled; running without cache');
    return;
  }

  state.enabled = true;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast instead of buffering
      connectTimeoutMS: 5000,
    });
    state.connected = true;
    state.error = null;
    logger.info('MongoDB connected; cache ready');
  } catch (err) {
    state.connected = false;
    state.error = err;
    logger.warn('MongoDB unavailable; continuing without cache', {
      reason: err.message,
    });
  }
}

function isConnected() {
  return state.connected && mongoose.connection.readyState === 1;
}

function isEnabled() {
  return state.enabled;
}

module.exports = connectDB;
module.exports.isConnected = isConnected;
module.exports.isEnabled = isEnabled;
