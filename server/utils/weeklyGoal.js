const ActivityLog = require("../models/ActivityLog");

async function analyseWeeklyGoal(userId) {
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

  const activities = await ActivityLog.find({
    user: userId,
    date: { $gte: startOfWeek },
  });

  const totalCO2 = activities.reduce((sum, a) => {
    const actSum = a.activities.reduce(
      (s, act) => s + act.quantity * act.co2Value,
      0
    );
    return sum + actSum;
  }, 0);

  const weeklyTarget = 10; // kg CO₂ target
  const remaining = Math.max(0, weeklyTarget - totalCO2);
  const progress = Math.min(100, (totalCO2 / weeklyTarget) * 100);

  let tip;
  if (remaining > 0) {
    tip = `You can still save ${remaining.toFixed(
      1
    )}kg CO₂ this week. Try walking or cycling instead of driving 🚶‍♀️🚴`;
  } else {
    tip = "Amazing! You’ve already reached your weekly CO₂ goal 🎉";
  }

  return { totalCO2, weeklyTarget, remaining, progress, tip };
}

module.exports = { analyseWeeklyGoal };
