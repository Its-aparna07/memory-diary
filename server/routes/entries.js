import express from "express";
import mongoose from "mongoose";
import Entry from "../models/Entry.js";

const router = express.Router();

// GET all diary entries
router.get("/", async (req, res) => {
  try {
    const entries = await Entry.find().sort({ entryDate: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch entries" });
  }
});

// CREATE a diary entry
router.post("/", async (req, res) => {
  try {
    const { title, content, mood, entryDate } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    const entry = await Entry.create({
      title,
      content,
      mood,
      entryDate,
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE a diary entry
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid entry ID" });
    }

    const entry = await Entry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a diary entry
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid entry ID" });
    }

    const entry = await Entry.findByIdAndDelete(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json({ message: "Entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete entry" });
  }
});

export default router;
