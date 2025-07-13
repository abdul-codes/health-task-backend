import jwt from 'jsonwebtoken';



// JWT Configuration
const ACCESS_TOKEN = process.env.ACCESS_TOKEN_SECRET  as string;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN_SECRET  as string;

// Generate Access Token

export const generateAccessToken = (userId: string, role: string) => {
  const payload = { id:userId, role };
  return jwt.sign(
    payload, 
    ACCESS_TOKEN, 
    { expiresIn: '30m' } // Longer expiry for mobile apps
  );
};

// Generate Refresh Token 
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, REFRESH_TOKEN, {
    expiresIn: '30d'
  });
};