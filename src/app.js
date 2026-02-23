/**
 * Configuración principal de Express
 */

const express = require("express");
const mongoose = require("mongoose");
const appointmentRoutes = require("./routes/appointment.routes");

const app = express();

// Middleware para leer JSON
app.use(express.json());

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/neobarber")
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err.message));

// Rutas
app.use("/api/appointments", appointmentRoutes);

module.exports = app;