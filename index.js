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
const SHEET_NAME = "ACTIVE";
const HEADER_RANGE = `${SHEET_NAME}!A1:B2`; // For Year and Quarter
const DATA_RANGE = `${SHEET_NAME}!A4:AE`; // From A4 to AE for all stamp data

// Get header information (Year and Quarter)
async function getHeaderInfo() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: HEADER_RANGE,
  });

  const headerRows = response.data.values;
  return {
    year: headerRows[0][1],
    quarter: headerRows[1][1],
  };
}

// Function to convert row data to stamps array
function convertRowToStamps(row) {
  // Skip first two columns (no and name) and convert remaining to boolean
  return row.slice(2).map((value) => value === "TRUE");
}

// Get stamp data for a specific user number
app.get("/stamps/:userNo", async (req, res) => {
  try {
    const userNo = req.params.userNo;

    // Fetch header info
    const headerInfo = await getHeaderInfo();

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: DATA_RANGE,
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
      period: {
        year: headerInfo.year,
        quarter: headerInfo.quarter,
      },
      no: userData[0],
      name: userData[1],
      stamps: convertRowToStamps(userData),
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
    // Fetch header info
    const headerInfo = await getHeaderInfo();

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: DATA_RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    // Format all data
    const allStampData = {
      period: {
        year: headerInfo.year,
        quarter: headerInfo.quarter,
      },
      users: rows.map((row) => ({
        no: row[0],
        name: row[1],
        stamps: convertRowToStamps(row),
      })),
    };

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
