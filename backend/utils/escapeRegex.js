// Escapes user input so it can be embedded in a RegExp / Mongo $regex literally.
const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
