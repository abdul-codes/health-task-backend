import crypto from 'crypto';
export const generateOtp = () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp
}


export const generatePasswordResetToken = () => {
  // 3. Generate password reset token (expires in 1 hour)
  const token = crypto.randomBytes(32).toString("hex");
  return token
}