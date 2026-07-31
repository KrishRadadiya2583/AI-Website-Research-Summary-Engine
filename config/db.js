const mongoose = require('mongoose');

const state = { connected: false, error: null };

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI not set — running without a database (results will not be cached).');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast instead of buffering
      connectTimeoutMS: 5000,
    });
    state.connected = true;
    console.log('[db] Connected to MongoDB');
  } catch (err) {
    state.error = err;
    console.warn('[db] MongoDB connection failed — running without a database.');
    console.warn(`[db] Reason: ${err.message}`);
    if (err.code === 'ECONNREFUSED' || err.syscall === 'querySrv') {
      console.warn('[db] SRV lookup failed. Common causes:');
      console.warn('     · No internet / VPN blocking DNS SRV records');
      console.warn('     · Atlas cluster paused or deleted');
      console.warn('     · Your public IP is not whitelisted in Atlas → Network Access');
      console.warn('[db] Workarounds:');
      console.warn('     · Use a non-SRV URI (mongodb://user:pass@host1,host2/db?ssl=true&replicaSet=…)');
      console.warn('     · Or run a local MongoDB and set MONGODB_URI=mongodb://127.0.0.1:27017/ai_website_research');
    }
  }

  mongoose.connection.on('disconnected', () => {
    state.connected = false;
    console.warn('[db] MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    state.connected = true;
    console.log('[db] MongoDB reconnected');
  });
}

function isConnected() {
  return state.connected && mongoose.connection.readyState === 1;
}

module.exports = connectDB;
module.exports.isConnected = isConnected;
