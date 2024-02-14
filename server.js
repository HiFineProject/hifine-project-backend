import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcrypt";
import helmet from "helmet";
import cors from "cors";
import databaseClient from "./services/database.mjs";
import { checkMissingField } from "./utilities/requestUtilities.js";
import { createJwt } from "./milddlewares/createJWT.js";
import { auth } from "./milddlewares/auth.js";
import { logmiddlewares } from "./milddlewares/logmiddlewares.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;
const SALT = 10;

const SIGNUP_DATA_KEYS = ["email", "password"];
const LOGIN_DATA_KEYS = ["email", "password"];

const webServer = express();

webServer.use(logmiddlewares())

dotenv.config();
webServer.use(express.json());
webServer.use(helmet());
webServer.use(cors());


webServer.get("/", async (req, res) => {
  res.status(200).send("This is server");
});

webServer.get("/users", async (req, res) => {
  const data = await databaseClient.db().collection("users").find().toArray();
  res.status(200).json(data);
});

webServer.post("/signup", async (req, res) => {
  let body = req.body;
  const [isBodyChecked, missingFields] = checkMissingField(
    SIGNUP_DATA_KEYS,
    body
  );

  const existingUser = await databaseClient.db().collection("users").findOne({ email: body.email });
  if (existingUser) {
    res.status(400).send("Email already exists");
    return;
  }
  
  if (!isBodyChecked) {
    res.status(400).send(`Missing Fields: ${"".concat(missingFields)}`);
    return;
  }

  const saltRound = await bcrypt.genSalt(SALT);
  body["password"] = await bcrypt.hash(body["password"], saltRound);

  const result = await databaseClient.db().collection("users").insertOne(body);
  const token = createJwt(body.email)
  res.status(201).json({ token, email: body.email, userId: result.insertedId });
  // res >> json(user_id) or email
  // if status 200 redirect
  // return user_id or email <unique
  //
  // req...
  // convert to base 64 post & get
  // encrypt base 64 FE >>> string >>> mongo objects or blob object
  //
});

webServer.post("/login", async (req, res) => {
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

  const token = createJwt(user.email);
  res.status(200).json({ token, message: `Your Login ${user.email}` });
  // this section is for cookies
  // res.send(createJwt(email), `Your Login ${user.email}`);
  // res.cookies('name', 'bearer' + token, {
  //  expire: new Date(Date.now() + 8 * 360000 // cookies will be remove after 8 hours
  // })
  // . coockies('test', 'test')
  //
  // refresh token?
  // alternative use session set cookies delete after close browser
});


webServer.put("/profile", async (req, res) => {
  //or patch
  let { profileImage, displayName } = req.body;
  const email = userSeession();

  const user = await databaseClient.db().collection("users").findOne({ email });
  if (!user) {
    return res.status(404).send("User not found.");
  }

  const updateProfile = {};
  if (profileImage) {
    updateProfile.profileImage = profileImage;
  }
  if (displayName) {
    updateProfile.displayName = displayName;
  }

  const result = await databaseClient
    .db()
    .collection("users")
    .insertOne({ email }, { $set: updateProfile });
  if ((result.modifiedCount = 1)) {
    res.status(200).send("Profile updated successfully.");
  } else {
    res.status(500).send("Failed to update profile.");
  }
});

// simple get posts data
webServer.get("/posts", async (req, res) => {
  const postdata = await databaseClient
    .db()
    .collection("activities")
    .find()
    .toArray();
  res.status(200).send(postdata);
});

// webServer.post("/posts", async (req, res) => {
//   const body = req.body;
//  data structure of posts
// { description, image, duration, distance, date by new Data() }
// });

webServer.post('/posts', async (req, res) => {
  const {description, image ,duration, distance} = req.body
})

webServer.get("/lists", async (req, res) => {
  const postdata = await databaseClient
    .db()
    .collection("activities")
    .find()
    .toArray();
  res.status(200).send(postdata);
});

webServer.get("/lists", async (req, res) => {
  // get userId from body then find lists that have the same userId

  const lists = await databaseClient.db("lists").find({ userId });
  res.status(200).send(lists);
});

webServer.post("/lists", async (req, res) => {
  let body = req.body;

  const listsdata = await databaseClient.db("lists").insertOne();

  res.status(200).send({ todoLists });
});

function createLists(attributes) {
  const defaultLists = {
    listsId: "",
    listsDescription: "",
    listsDate: "",
    listsStatus: false,
  };
  const lists = {
    ...defaultLists,
    ...attributes,
    id: lists.id,
  };
  listsDatabase[lists.listsId] = lists;
  return lists;
}

//testing auth annd cookies
// webServer.get('/home', auth, (req, res) =>{
//   res.send(`This is userhome`)
// })

// webServer.get('/profile', auth, (req, res) =>{
//   res.send(`This is user profile`)
// })

// webServer.get('/lists', auth, (req, res) =>{
//   res.send(`This is lists`)
// })

const currentServer = webServer.listen(PORT, HOSTNAME, () => {
  console.log(
    `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
  );
  console.log(`SERVER IS ONLINE => http://${HOSTNAME}:${PORT}`);
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
