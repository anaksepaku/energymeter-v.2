const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ strict: false }));

// Simpan data dengan timestamp
let sensorData = [];
let latestData = {};
let deviceStatus = {
  isOnline: false,
  lastSeen: null,
  deviceId: null,
};

// Timeout dalam milisecond (30 detik)
const DEVICE_TIMEOUT = 30000;

// Function to validate data
function validateSensorData(data) {
  const validated = { ...data };

  if (isNaN(validated.voltage) || !isFinite(validated.voltage))
    validated.voltage = 0;
  if (isNaN(validated.current) || !isFinite(validated.current))
    validated.current = 0;
  if (isNaN(validated.power) || !isFinite(validated.power)) validated.power = 0;
  if (isNaN(validated.energy) || !isFinite(validated.energy))
    validated.energy = 0;
  if (isNaN(validated.frequency) || !isFinite(validated.frequency))
    validated.frequency = 0;
  if (isNaN(validated.power_factor) || !isFinite(validated.power_factor))
    validated.power_factor = 0;

  return validated;
}

// Function to check device status
function checkDeviceStatus() {
  const now = Date.now();
  if (deviceStatus.lastSeen && now - deviceStatus.lastSeen > DEVICE_TIMEOUT) {
    deviceStatus.isOnline = false;
  }
}

// Check status every 5 seconds
setInterval(checkDeviceStatus, 5000);

// Route untuk terima data dari ESP32
app.post("/api/data", (req, res) => {
  console.log("Data received:", req.body);

  try {
    // Validasi data
    const validatedData = validateSensorData(req.body);

    // Update device status
    deviceStatus.isOnline = true;
    deviceStatus.lastSeen = Date.now();
    deviceStatus.deviceId = req.body.deviceId || "ESP32_PZEM";

    // Tambah timestamp
    const dataWithTime = {
      ...validatedData,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      deviceId: deviceStatus.deviceId,
    };

    // Simpan data
    latestData = dataWithTime;
    sensorData.push(dataWithTime);

    // Simpan hanya 100 data terakhir
    if (sensorData.length > 100) {
      sensorData = sensorData.slice(-100);
    }

    res.json({
      message: "Data received OK!",
      status: "success",
      device_status: "online",
    });
  } catch (error) {
    console.error("Error processing data:", error);
    res.status(400).json({
      error: "Invalid data format",
      message: error.message,
    });
  }
});

// Route untuk ambil data terbaru + status
app.get("/api/latest", (req, res) => {
  const response = {
    ...latestData,
    device_status: deviceStatus,
  };
  res.json(response);
});

// Route untuk ambil status device saja
app.get("/api/status", (req, res) => {
  res.json(deviceStatus);
});

// Route untuk ambil semua data
app.get("/api/all", (req, res) => {
  res.json(sensorData);
});

// Route untuk reset data
app.delete("/api/reset", (req, res) => {
  sensorData = [];
  latestData = {};
  deviceStatus = {
    isOnline: false,
    lastSeen: null,
    deviceId: null,
  };
  res.json({ message: "Data reset successfully" });
});

// Serve halaman dashboard
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Jalankan server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log("\n📋 Endpoints:");
  console.log(`  POST data  : http://localhost:${PORT}/api/data`);
  console.log(`  GET latest : http://localhost:${PORT}/api/latest`);
  console.log(`  GET status : http://localhost:${PORT}/api/status`);
  console.log(`  GET all    : http://localhost:${PORT}/api/all`);
});
