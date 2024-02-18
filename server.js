import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import multer from "multer";
import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import databaseClient from "./services/database.mjs";
import { auth } from "./milddlewares/auth.js";
import { logmiddlewares } from "./milddlewares/logmiddlewares.js";
import * as listsControllers from "./controllers/listsControllers.js";
import * as usersControllers from "./controllers/usersControllers.js";
import * as postsController from "./controllers/postsController.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;

dotenv.config();

const webServer = express();

webServer.use(logmiddlewares());
webServer.use(express.json());
webServer.use(helmet());
webServer.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

async function uploadToCloudinary(req, res, next) {
  const fileBufferBase64 = Buffer.from(req.file.buffer).toString("base64");
  const base64File = `data:${req.file.mimetype};base64,${fileBufferBase64}`;
  req.cloudinary = await cloudinary.uploader.upload(base64File, {
    resource_type: "auto",
  });

  next();
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

webServer.get("/", async (req, res) => {
  res.status(200).send("Welcome to HiFine Server");
});

// SignUp SignIn Profile
webServer.get("/user", auth, usersControllers.getUsers);
webServer.post("/signup", usersControllers.signupUser);
webServer.post("/signin", usersControllers.signinUser);
webServer.patch(
  "/createProfile",
  auth,
  upload.single("image"),
  uploadToCloudinary,
  usersControllers.createProfile
);

// //posts GET POST PATCH(PUT) DELETE
webServer.get("/posts", auth, postsController.getPosts);

webServer.post(
  "/posts",
  auth,
  upload.single("image"),
  uploadToCloudinary,
  postsController.postPosts
);

// webServer.patch(
//   "/posts/:postId",
//   auth,
//   upload.single("image"),
//   uploadToCloudinary,
//   postsController.patchPosts
// );

webServer.delete(
  "/posts/:postId",
  auth,
  upload.single("image"),
  uploadToCloudinary,
  postsController.deletePosts
);

// lists GET POST PATCH(PUT) DELETE
webServer.get("/lists", auth, listsControllers.getLists);
webServer.post("/lists", auth, listsControllers.postList);
webServer.patch("/lists/:listId", auth, listsControllers.patchList);
webServer.delete("/lists/:listId", auth, listsControllers.deleteList);

//  for Localhost
// const currentServer = webServer.listen(PORT, HOSTNAME, () => {
//   console.log(
//     `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
//   );
//   console.log(`SERVER IS ONLINE => http://${HOSTNAME}:${PORT}`);
// });

// for Render
const currentServer = webServer.listen(process.env.PORT || 3000, () => {

  console.log(
    `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
  );
  console.log(`SERVER IS ONLINE`);
});

const cleanup = () => {
  currentServer.close(() => {
    console.log(
      `DISCONNECT DATABASE: NAME => ${databaseClient.db().databaseName}`
    );
    try {
      databaseClient.close();
    } catch (error) {
      console.error(error);
    }
  });
};

process.on(`SIGNTERM`, cleanup);
process.on(`SIGINT`, cleanup);
