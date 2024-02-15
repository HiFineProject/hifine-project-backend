import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcrypt";
import helmet from "helmet";
import cors from "cors";
import { ObjectId } from "mongodb";
import databaseClient from "./services/database.mjs";
import { checkMissingField } from "./utilities/requestUtilities.js";
import { createJwt } from "./milddlewares/createJwt.js";
import { auth } from "./milddlewares/auth.js";
import { logmiddlewares } from "./milddlewares/logmiddlewares.js";

const HOSTNAME = process.env.SERVER_IP || "127.0.0.1";
const PORT = process.env.SERVER_PORT || 3000;
const SALT = 10;

const SIGNUP_DATA_KEYS = ["email", "password"];
const LOGIN_DATA_KEYS = ["email", "password"];

const webServer = express();

webServer.use(logmiddlewares());

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

  const existingUser = await databaseClient
    .db()
    .collection("users")
    .findOne({ email: body.email });
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
  const token = createJwt(body.email);
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


webServer.post("/lists", async (req, res) => {
  const { title, todoItem, dateTime } = req.body;
  const missingFields = [];

  if (!title) {
    missingFields.push("title");
  }
  if (!todoItem) {
    missingFields.push("todoItem");
  }
  if (!dateTime) {
    missingFields.push("dateTime");
  }

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ message: `Missing required data: ${missingFields.join(", ")}` });
  } else {
    try {
      const result = await databaseClient.db().collection("lists").insertOne({
        title: title,
        todoItem: todoItem,
        dateTime: dateTime,
      });
      return res
        .status(200)
        .json({ message: "List created successfully", result });
    } catch (error) {
      console.error("Error creating list:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

webServer.get("/lists", async (req, res) => {
  try {
    const lists = await databaseClient
      .db()
      .collection("lists")
      .find()
      .toArray();
    res.status(200).send(lists);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: { message: "Internal Server Error" } });
  }
});

webServer.patch("/lists/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const { title, todoItem, dateTime } = req.body;
    const objectId = new ObjectId(listId);
    const existingList = await databaseClient
      .db()
      .collection("lists")
      .findOne({ _id: objectId });

    if (!existingList) {
      return res.status(404).json({ message: "List not found" });
    }
    const updateOperation = {};
    if (title) {
      updateOperation.title = title;
    }
    if (todoItem) {
      updateOperation.todoItem = todoItem;
    }
    if (dateTime) {
      updateOperation.dateTime = dateTime;
    }
    const updateResult = await databaseClient
      .db()
      .collection("lists")
      .updateOne({ _id: objectId }, { $set: updateOperation });

    if (updateResult.modifiedCount === 0) {
      return res.status(304).json({ message: "No fields to update" });
    }

    res.status(200).json({ message: "List updated successfully" });
  } catch (error) {
    console.error("Error updating list:", error);
    res.status(500).json({ message: "An error occurred while updating the list" });
  }
});

webServer.delete("/lists/:listId", async (req, res) => {
  try {
    const { listId } = req.params;
    const objectId = new ObjectId(listId);
    const deleteResult = await databaseClient
      .db()
      .collection("lists")
      .deleteOne({ _id: objectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "List not found" });
    }
    res.status(200).json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting list:", error);
    res.status(500).json({ message: "An error occurred while deleting the list" });
  }
});

const currentServer = webServer.listen(() => {
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
