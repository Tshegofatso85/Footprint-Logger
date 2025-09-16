const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog");
const mongoose = require("mongoose");
const authenticate = require("../middleware/auth");

// helper: normalize date to midnight (UTC)
function startOfDay(d) {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// create or append to a day log for user
router.post("/log", async (req, res) => {
  // expected body: { date: 'YYYY-MM-DD', activity: { name, category, unit, quantity, co2Value } }
  try {
    const userId = req.user._id;
    const { date, activity } = req.body;
    if (!date || !activity)
      return res.status(400).json({ message: "date and activity required" });

    const day = startOfDay(date);
    const totalCO2 = Number(activity.quantity) * Number(activity.co2Value);

    const item = {
      name: activity.name,
      activity: activity.activity || activity.name,
      category: activity.category,
      unit: activity.unit,
      quantity: Number(activity.quantity),
      co2Value: Number(activity.co2Value),
      totalCO2: Number(totalCO2),
    };

    // find existing day
    let log = await ActivityLog.findOne({ user: userId, date: day });
    if (!log) {
      log = new ActivityLog({ user: userId, date: day, activities: [item] });
    } else {
      log.activities.push(item);
    }
    await log.save();
    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// get logs for user (optionally range)
router.get("/my-logs", async (req, res) => {
  try {
    const userId = req.user._id;
    const { from, to } = req.query; // optional YYYY-MM-DD
    const query = { user: userId };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = startOfDay(from);
      if (to) query.date.$lte = startOfDay(to);
    }
    const logs = await ActivityLog.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// get total emissions for a given date (user)
router.get("/my-total", async (req, res) => {
  try {
    const userId = req.user._id;
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const day = startOfDay(date);
    const log = await ActivityLog.findOne({ user: userId, date: day });
    const total = log
      ? log.activities.reduce((s, a) => s + Number(a.totalCO2), 0)
      : 0;
    res.json({ date: day, total: Number(total.toFixed(2)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// weekly summary: last 7 days totals for the user (returns array of {date, total})
router.get("/weekly-summary", async (req, res) => {
  try {
    const userId = req.user._id;
    const end = startOfDay(req.query.end || new Date());
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);

    // aggregate per day
    const agg = await ActivityLog.aggregate([
      {
        $match: {
          user: new mongoose.mongo.ObjectId(userId),
          date: { $gte: start, $lte: end },
        },
      },
      { $unwind: "$activities" },
      { $group: { _id: "$date", total: { $sum: "$activities.totalCO2" } } },
      { $sort: { _id: 1 } },
    ]);

    // build day list for full 7 days (fill zeros)
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      d.setUTCHours(0, 0, 0, 0);
      const found = agg.find((a) => new Date(a._id).getTime() === d.getTime());
      result.push({
        date: d.toISOString().split("T")[0],
        total: found ? Number(found.total.toFixed(2)) : 0,
      });
    }

    // streak: number of consecutive days ending today with total < some threshold (or >0)
    // simple streak of days with any activity
    let streak = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setUTCDate(end.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const found = result.find(
        (r) => r.date === d.toISOString().split("T")[0]
      );
      if (found && found.total > 0) streak++;
      else if (found && found.total === 0) break;
    }

    res.json({ summary: result, streak });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Community average emission per day (across users) for date or range
router.get("/community-average", async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = startOfDay(from);
      if (to) match.date.$lte = startOfDay(to);
    }
    const agg = await ActivityLog.aggregate([
      { $match: match },
      { $unwind: "$activities" },
      { $group: { _id: "$user", userTotal: { $sum: "$activities.totalCO2" } } },
      {
        $group: {
          _id: null,
          avgPerUser: { $avg: "$userTotal" },
          totalAll: { $sum: "$userTotal" },
          usersCount: { $sum: 1 },
        },
      },
    ]);

    const out = agg[0] || { avgPerUser: 0, totalAll: 0, usersCount: 0 };
    res.json({
      avgPerUser: Number((out.avgPerUser || 0).toFixed(2)),
      totalAll: Number((out.totalAll || 0).toFixed(2)),
      usersCount: out.usersCount || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Leaderboard: lowest average footprint per user over the last N days
router.get("/leaderboard", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "7", 10);
    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const agg = await ActivityLog.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $unwind: "$activities" },
      {
        $group: {
          _id: { user: "$user", date: "$date" },
          dayTotal: { $sum: "$activities.totalCO2" },
        },
      },
      {
        $group: {
          _id: "$_id.user",
          avgDaily: { $avg: "$dayTotal" },
          total: { $sum: "$dayTotal" },
        },
      },
      { $sort: { avgDaily: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          email: "$user.email",
          avgDaily: 1,
          total: 1,
        },
      },
    ]);

    res.json(
      agg.map((a) => ({
        userId: a.userId,
        name: a.name,
        email: a.email,
        avgDaily: Number(a.avgDaily.toFixed(2)),
        total: Number(a.total.toFixed(2)),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// delete a single activity from a user's log by logId + activityId
// delete a single activity from a user's log by logId + activityId
router.delete(
  "/:logId/activities/:activityId",
  authenticate,
  async (req, res) => {
    const { logId, activityId } = req.params;
    const userId = req.user._id;

    console.log("Attempting to delete activity");
    console.log("User ID:", userId);
    console.log("Log ID:", logId);
    console.log("Activity ID:", activityId);

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(logId) ||
      !mongoose.Types.ObjectId.isValid(activityId)
    ) {
      console.error("Invalid logId or activityId");
      return res.status(400).json({ message: "Invalid logId or activityId" });
    }

    try {
      // Find the log for this user
      const log = await ActivityLog.findOne({ _id: logId, user: userId });
      if (!log) {
        console.error("Log not found for user");
        return res.status(404).json({ message: "Log not found" });
      }

      // Find the activity subdocument
      const activity = log.activities.id(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Remove the subdocument
      await activity.deleteOne();

      // If no activities remain, remove the whole log
      if (log.activities.length === 0) {
        await log.deleteOne();
        console.log(
          "Activity deleted; log removed as it had no more activities"
        );
        return res
          .status(200)
          .json({ message: "Activity deleted; log removed", logId });
      }

      // Otherwise, save the updated log
      await log.save();

      console.log("Activity deleted successfully");
      res.status(200).json({ message: "Activity deleted successfully", log });
    } catch (err) {
      console.error("Error deleting activity:", err);
      res.status(500).json({
        message: "Server error while deleting activity",
        error: err.message,
      });
    }
  }
);

// router.get("/activities", authenticate, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { category } = req.query; // optional query param

//     // Build a filter for user
//     let matchStage = { user: userId };
//     if (category) {
//       // only match logs with activities of that category
//       matchStage["activities.category"] = category;
//     }

//     // Flatten activities with $unwind
//     const activities = await ActivityLog.aggregate([
//       { $match: { user: userId } },
//       { $unwind: "$activities" },
//       category
//         ? { $match: { "activities.category": category } }
//         : { $match: {} },
//       {
//         $project: {
//           _id: 0,
//           logId: "$_id",
//           date: "$date",
//           name: "$activities.name",
//           activity: "$activities.activity",
//           category: "$activities.category",
//           unit: "$activities.unit",
//           quantity: "$activities.quantity",
//           co2Value: "$activities.co2Value",
//           totalCO2: "$activities.totalCO2",
//         },
//       },
//     ]);

//     // Calculate total CO₂
//     const totalCO2 = activities.reduce((sum, a) => sum + a.totalCO2, 0);

//     res.json({
//       total: activities.length,
//       totalCO2,
//       activities,
//     });
//   } catch (err) {
//     console.error("Error fetching activities:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// GET all activities for a user (with optional category filter)
router.get("/all", async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user._id; // comes from authenticate middleware in server.js

    const logs = await ActivityLog.find({ user: userId }).lean();

    let activities = logs.flatMap((log) =>
      log.activities.map((a) => ({
        ...a,
        date: log.date,
      }))
    );

    if (category) {
      activities = activities.filter((a) => a.category === category);
    }

    const totalCO2 = activities.reduce((sum, a) => sum + a.totalCO2, 0);

    res.status(200).json({
      activities,
      total: activities.length,
      totalCO2,
    });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

module.exports = router;
