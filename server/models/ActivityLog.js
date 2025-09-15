const mongoose = require("mongoose");

// Each activity in a log
const ActivityItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Beef - per 100g"
    activity: { type: String }, // optional original activity reference
    category: { type: String, required: true }, // transport|food|energy|waste
    unit: { type: String },
    quantity: { type: Number, required: true },
    co2Value: { type: Number, required: true },
    totalCO2: { type: Number, required: true },
  },
  { _id: true } // ensures each activity gets a unique Mongo _id
);

const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true }, // store as midnight UTC
  activities: [ActivityItemSchema],
  createdAt: { type: Date, default: Date.now },
});

ActivityLogSchema.index({ user: 1, date: 1 }, { unique: false });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
