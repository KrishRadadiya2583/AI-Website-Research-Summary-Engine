const dns = require('node:dns').promises;
const net = require('node:net');

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      parts[0] >= 224;
  }
  if (net.isIPv6(address)) {
    const value = address.toLowerCase();
    return value === '::' || value === '::1' || value.startsWith('fc') ||
      value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') ||
      value.startsWith('fea') || value.startsWith('feb') || value.startsWith('::ffff:127.') ||
      value.startsWith('::ffff:10.') || value.startsWith('::ffff:192.168.');
  }
  return true;
}

const urlValidator = async (req, res, next) => {
  const url = req.body?.url || req.body?.urlinput;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: "URL is required"
    });
  }

  if (typeof url !== 'string' || url.length > 2048) {
    return res.status(400).json({ success: false, message: 'URL must be a string of at most 2048 characters' });
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.status(400).json({
        success: false,
        message: "Only HTTP/HTTPS URLs are allowed"
      });
    }

    if (parsedUrl.username || parsedUrl.password) {
      return res.status(400).json({ success: false, message: 'URLs containing credentials are not allowed' });
    }

    const addresses = await dns.lookup(parsedUrl.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      return res.status(400).json({ success: false, message: 'Private or local network URLs are not allowed' });
    }

    parsedUrl.hash = '';
    req.researchUrl = parsedUrl.href;
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.code === 'ENOTFOUND' ? 'Hostname could not be resolved' : 'Invalid URL format'
    });
  }
};

module.exports = urlValidator;
module.exports.isPrivateAddress = isPrivateAddress;
