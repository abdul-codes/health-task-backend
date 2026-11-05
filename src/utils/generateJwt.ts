import jwt from 'jsonwebtoken';



// JWT Configuration
const ACCESS_TOKEN = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN) {
  throw new Error('ACCESS_TOKEN_SECRET environment variable is required');
}

// Generate Access Token

export const generateAccessToken = (userId: string, role: string) => {
  const payload = { id:userId, role };
  return jwt.sign(
    payload, 
    ACCESS_TOKEN, 
    { expiresIn: '30m' } // Longer expiry for mobile apps
  );
};
