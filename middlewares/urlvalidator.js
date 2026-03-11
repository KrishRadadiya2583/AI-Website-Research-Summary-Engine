const urlValidator = (req, res, next) => {
  const url  = req.body.urlinput;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: "URL is required"
    });
  }

  try {
    const parsedUrl = new URL(url);

    // Allow only http or https
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.status(400).json({
        success: false,
        message: "Only HTTP/HTTPS URLs are allowed"
      });
    }

    next(); // URL is valid
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid URL format"
    });
  }
};

module.exports = urlValidator;