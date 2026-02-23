const mongoose = require("mongoose");
const Counter = require("./counter.model");

/**
 * Esquema de citas
 */
const appointmentSchema = new mongoose.Schema(
  {
    // ID autoincrementable
    appointmentId: {
      type: Number,
      unique: true,
      index: true,
    },

    clientName: {
      type: String,
      required: [true, "El nombre del cliente es obligatorio"],
      trim: true,
    },

    barberName: {
      type: String,
      required: [true, "El nombre del barbero es obligatorio"],
      trim: true,
    },

    service: {
      type: String,
      required: [true, "El servicio es obligatorio"],
      trim: true,
    },

    date: {
      type: String,
      required: [true, "La fecha es obligatoria"],
      trim: true,
    },

    time: {
      type: String,
      required: [true, "La hora es obligatoria"],
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVA", "CANCELADA"],
      default: "ACTIVA",
    },
  },
  { timestamps: true }
);

/**
 * Índices únicos (reglas de negocio)
 * - Un cliente no puede tener dos citas en la misma fecha/hora
 * - Un barbero no puede tener dos citas en la misma fecha/hora
 */
appointmentSchema.index({ clientName: 1, date: 1, time: 1 }, { unique: true });
appointmentSchema.index({ barberName: 1, date: 1, time: 1 }, { unique: true });

/**
 * Autoincremento automático*/
appointmentSchema.pre("save", async function () {
  // Solo asigna appointmentId cuando el documento es nuevo
  if (!this.isNew || this.appointmentId) return;

  const counter = await Counter.findOneAndUpdate(
    { _id: "appointmentId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.appointmentId = counter.seq;
});

module.exports = mongoose.model("Appointment", appointmentSchema);