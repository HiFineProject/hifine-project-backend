import jwt from 'jsonwebtoken';

export const createJwt = (email) => {
  const jwtSecretKey = process.env.JWT_SECRET_KEY;
  const token = jwt.sign({ email: email }, jwtSecretKey, {
    expiresIn: "8h",
  });
  return token;
}