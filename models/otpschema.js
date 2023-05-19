const mongoose= require("mongoose");
const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isUsed: { type: Boolean, default: false },

  });
  
  const OTP = mongoose.model('OTP', otpSchema);
  
  module.exports = OTP;