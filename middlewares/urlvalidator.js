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

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.status(400).json({
        success: false,
        message: "Only HTTP/HTTPS URLs are allowed"
      });
    }

    next(); 
    
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid URL format"
    });
  }
};

module.exports = urlValidator;