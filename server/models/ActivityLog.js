const mongoose = require("mongoose");

const ActivityItemSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Beef - per 100g"
  activity: { type: String }, // original activity id/name if needed
  category: { type: String, required: true }, // transport|food|energy|waste
  unit: { type: String },
  quantity: { type: Number, required: true }, // numeric quantity
  co2Value: { type: Number, required: true }, // kg per unit
  totalCO2: { type: Number, required: true }, // computed = quantity * co2Value
});

const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true }, // date for the log (store as midnight UTC)
  activities: [ActivityItemSchema],
  createdAt: { type: Date, default: Date.now },
});

ActivityLogSchema.index({ user: 1, date: 1 }, { unique: false });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
