import { ObjectId } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import databaseClient from "../services/database.mjs";

export const getPosts = async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId); // Convert userId to ObjectId
    const posts = await databaseClient
      .db()
      .collection("posts")
      .find({ userId: userId })
      .toArray();

    res.status(200).send(posts);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: { message: "Internal Server Error" } });
  }
};

export const postPosts = async (req, res) => {
  try {
    if (!req.file || !req.cloudinary) {
      return res.status(400).json({ error: "File upload failed." });
    }
    const { description, duration, distance, activityType } = req.body;
    const { hour, min } = JSON.parse(duration);
    const { km, m } = JSON.parse(distance);

    const { public_id, secure_url } = req.cloudinary;
    const userId = new ObjectId(req.user.userId);

    const result = await databaseClient.db().collection("posts").insertOne({
      userId,
      description,
      duration: { hour, min },
      distance: { km, m },
      activityType,
      image: {
        public_id,
        secure_url,
      },
    });

    if (result.insertedCount === 1) {
      console.log("Post created successfully:", result.ops[0]);
      return res.status(201).json({ message: "Post created successfully." });
    } else {
      console.log("Failed to create post:", result);
      return res.status(500).json({ error: "Failed to create post." });
    }
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ error: "Failed to create post." });
  }
};

export const patchPosts = async (req, res) => {};

export const deletePosts = async (req, res) => {
    const postId = new ObjectId(req.params.postId)
    const image = {
        public_id: req.cloudinary.public_id,
        secure_url: req.cloudinary.secure_url,
    }
    try {
        if (image.public_id) {
            await cloudinary.uploader.destroy(image.public_id)
        }

        // Delete the post from the database using the postId
        const result = await databaseClient
            .db()
            .collection("posts")
            .deleteOne({ _id: postId });

        // Check if the post was deleted successfully
        if (result.deletedCount === 1) {
            console.log("Post deleted successfully.");
            return res.status(200).json({ message: "Post deleted successfully." });
        } else {
            console.log("Failed to delete post:", result);
            return res.status(404).json({ error: "Post not found." });
        }
    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({ error: "Failed to delete post." });
    }
};
