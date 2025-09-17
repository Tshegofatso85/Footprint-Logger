# 🌍 Footprint Logger

Footprint Logger is a full-stack web app that allows users to log daily activities (transport, food, energy, waste) and see their carbon emissions.  
It also provides **community stats** and a **leaderboard** to encourage sustainable habits.

---

## 🚀 Features

- Register / Login with JWT authentication
- Log activities with CO₂ values
- Dashboard with activity logs and totals
- Pie chart of emissions by category
- Community average emissions
- Leaderboard of users with lowest footprint
- Logged-in user is highlighted on leaderboard
- Responsive frontend built with vanilla JS + Chart.js

---

## ⚙️ Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) (>= 18.x recommended)
- [MongoDB](https://www.mongodb.com/) (local or remote instance)

---

## 📦 Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/Tshegofatso85/Footprint-Logger.git
   cd footprint-logger/server

   ```

2. Install Dependencies:

   ```bash
   npm install

   ```

3. Create a .env file in the server directory with the following:

   - PORT: The server port (default: 4000)

   - MONGO_URI: Connection string for MongoDB

   - JWT_SECRET: Secret used to sign JWT tokens

4. Start the server:

   ```bash
   npm start
   ```

---

## Running the App

- Visit http://localhost:4000 in your browser.

- You’ll see the Home page with login/register forms.

- Once logged in, you can log activities, view your dashboard, and see the leaderboard.

- Community stats are available in the Community page.

---

## 👩🏽‍💻 Author

Built with ❤️ by Tshegofatso Kgokong
