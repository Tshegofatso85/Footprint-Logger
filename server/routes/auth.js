const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { analyseWeeklyGoal } = require("../utils/weeklyGoal");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const user = new User({
      email: email.toLowerCase(),
      passwordHash: hash,
      name,
    });
    await user.save();

    const token = jwt.sign({ sub: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const weeklyGoal = await analyseWeeklyGoal(user._id);

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name },
      weeklyGoal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ sub: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const weeklyGoal = await analyseWeeklyGoal(user._id);

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name },
      weeklyGoal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
