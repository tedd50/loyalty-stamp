// Required dependencies
const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets configuration
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

// Configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = "Sheet1!A2:E"; // Assuming headers are in row 1

// Get stamp data for a specific user number
app.get("/stamps/:userNo", async (req, res) => {
  try {
    const userNo = req.params.userNo;

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    // Find the user by their number
    const userData = rows.find((row) => row[0] === userNo);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Format the response
    const stampData = {
      no: userData[0],
      name: userData[1],
      stamps: {
        stamp1: userData[2]?.toLowerCase() === "true",
        stamp2: userData[3]?.toLowerCase() === "true",
        stamp3: userData[4]?.toLowerCase() === "true",
      },
    };

    res.json(stampData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all stamps data
app.get("/stamps", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    // Format all data
    const allStampData = rows.map((row) => ({
      no: row[0],
      name: row[1],
      stamps: {
        stamp1: row[2]?.toLowerCase() === "true",
        stamp2: row[3]?.toLowerCase() === "true",
        stamp3: row[4]?.toLowerCase() === "true",
      },
    }));

    res.json(allStampData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
