import express from "express";
import mysql from "mysql2";
import bodyParser from "body-parser";
import { config } from "dotenv";

config({ path: "./config.env" });

const app = express();
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to the database");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//Add School API
app.post("/addSchool", (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  if (
    !name ||
    !address ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  const sql =
    "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, address, latitude, longitude], (err, result) => {
    if (err) throw err;
    res
      .status(201)
      .json({
        message: "School added successfully",
        schoolId: result.insertId,
      });
  });
});

//haversineDistance function
const haversineDistance = ([lat1, lon1], [lat2, lon2]) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

//List Schools API
app.get("/listSchools", (req, res) => {
  const { latitude, longitude } = req.query;

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({
      error: "Invalid input data",
    });
  }

  const userLocation = [lat, lon];
  const sql = "SELECT * FROM schools";

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query failed" });

    const sortedSchools = results
      .map((school) => {
        const schoolLocation = [school.latitude, school.longitude];
        return {
          ...school,
          distance: haversineDistance(userLocation, schoolLocation),
        };
      })
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json(sortedSchools);
  });
});
