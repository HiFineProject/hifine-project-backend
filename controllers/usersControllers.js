import bcrypt from "bcrypt";
import databaseClient from "../services/database.mjs";
import { v2 as cloudinary } from "cloudinary";
import { ObjectId } from "mongodb";
import { createJwt } from "../milddlewares/createJwt.js";
import { checkMissingField } from "../utilities/requestUtilities.js";

const SALT = 10;

const SIGNUP_DATA_KEYS = ["email", "password"];
const LOGIN_DATA_KEYS = ["email", "password"];

export const getUsers = async (req, res) => {
  const data = await databaseClient.db().collection("users").find().toArray();
  res.status(200).json(data);
};

export const signupUser = async (req, res) => {
  try {
    let body = req.body;
    const [isBodyChecked, missingFields] = checkMissingField(
      SIGNUP_DATA_KEYS,
      body
    );
    const existingUser = await databaseClient
      .db()
      .collection("users")
      .findOne({ email: body.email });
    if (existingUser) {
      return res.status(400).send("Email already exists");
    }
    if (!isBodyChecked) {
      return res
        .status(400)
        .send(`Missing Fields: ${missingFields.join(", ")}`);
    }

    const saltRound = await bcrypt.genSalt(SALT);
    body["password"] = await bcrypt.hash(body["password"], saltRound);

    const result = await databaseClient
      .db()
      .collection("users")
      .insertOne(body);
    const userId = result.insertedId;
    const token = createJwt({ userId: userId, email: body.email });

    return res.status(201).json({ token, userId, email: body.email });
  } catch (error) {
    console.error("Error signing up user:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const signinUser = async (req, res) => {
  let body = req.body;
  const [isBodyChecked, missingFields] = checkMissingField(
    LOGIN_DATA_KEYS,
    body
  );
  if (!isBodyChecked) {
    res.status(400).send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }
  const user = await databaseClient
    .db()
    .collection("users")
    .findOne({ email: body.email });
  if (user === null) {
    res.status(400).send(`User or Password not found: User`);
    return;
  }
  if (!bcrypt.compareSync(body.password, user.password)) {
    res.status(400).send("User or Password not found: Password");
    return;
  }

  const token = createJwt(user.userId, user.email);
  res.status(200).json({ token, message: `Your Login ${user.email}` });
};

// export const createProfile = async (req, res) => {
//   try {
//     if (!req.file || !req.cloudinary) {
//       return res.status(400).json({ error: "File upload failed." });
//     }

//     const userId = new ObjectId(req.user.userId);
//     const user = await databaseClient
//       .db()
//       .collection("users")
//       .findOne({ _id: userId });

//     if (!user) {
//       return res.status(404).json({ error: "User not found." });
//     }

//     const result = await databaseClient
//       .db()
//       .collection("users")
//       .updateOne(
//         { _id: userId },
//         { $set: { profileImage: req.cloudinary.secure_url } }
//       );

//     if (result.modifiedCount === 1) {
//       res.json({
//         message: "Image uploaded and updated profile picture successfully.",
//         public_id: req.cloudinary.public_id,
//         secure_url: req.cloudinary.secure_url,
//         UserId: user._id,
//       });
//     } else {
//       res.status(500).json({ error: "Failed to update profile picture." });
//     }
//   } catch (error) {
//     console.error("Error updating profile picture:", error);
//     res.status(500).json({ error: "Failed to update profile picture." });
//   }
// };
