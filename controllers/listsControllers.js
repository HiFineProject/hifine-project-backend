import { ObjectId } from "mongodb";
import databaseClient from "../services/database.mjs";

export const getLists = async (req, res) => {
  try {
    const userId = req.user.userId;

    const lists = await databaseClient
      .db()
      .collection("lists")
      .find({ userId: userId })
      .toArray();

    res.status(200).send(lists);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: { message: "Internal Server Error" } });
  }
};

export const postList = async (req, res) => {
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
      const userId = req.user.userId; // userId is available in req.user from token

      const result = await databaseClient.db().collection("lists").insertOne({
        userId: userId,
        title: title,
        dateTime: dateTime,
        todoItem: todoItem,
      });

      return res
        .status(200)
        .json({ message: "List created successfully", result });
    } catch (error) {
      console.error("Error creating list:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
};


export const patchList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { title, todoItem, dateTime } = req.body;
    const userId = req.user.userId; // Assuming userId is available in req.user
    const objectId = new ObjectId(listId);
    const existingList = await databaseClient
      .db()
      .collection("lists")
      .findOne({ _id: objectId, userId: userId });

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
    res
      .status(500)
      .json({ message: "An error occurred while updating the list" });
  }
};

export const deleteList = async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.userId; // Assuming userId is available in req.user
    const objectId = new ObjectId(listId);
    const deleteResult = await databaseClient
      .db()
      .collection("lists")
      .deleteOne({ _id: objectId, userId: userId });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "List not found" });
    }

    res.status(200).json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting list:", error);
    res
      .status(500)
      .json({ message: "An error occurred while deleting the list" });
  }
};
