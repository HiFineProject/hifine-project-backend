import jwt from "jsonwebtoken";

export const createJwt = ({ userId, email }) => {
  const jwtSecretKey = process.env.JWT_SECRET_KEY;
  const token = jwt.sign({ userId: userId.toString(), email: email }, jwtSecretKey, {
    expiresIn: "8h",
  });
  return token;
};