import jwt from "jsonwebtoken";
import { ObjectId } from 'mongodb';

export const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const jwtSecretKey = process.env.JWT_SECRET_KEY;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).send({ error: { message: "Unauthorized" } });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    if (!ObjectId.isValid(decoded.userId)) {
      return res.status(400).send({ error: { message: "Invalid userId in token" } });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    res.status(400).send({ error: { message: "Invalid token" } });
  }
};