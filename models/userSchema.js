const mongoose= require('mongoose');
const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    consecutiveWrongAttempts: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: null },
  });
  const User = mongoose.model('User', userSchema);

  module.exports = User;