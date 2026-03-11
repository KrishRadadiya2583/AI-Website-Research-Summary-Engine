function readingTime(text) {

  const words = text.split(" ").length;

  const minutes = Math.ceil(words / 200);

  return minutes + " minutes";

}

module.exports = readingTime;