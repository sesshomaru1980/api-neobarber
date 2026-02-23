const Appointment = require("../models/appointment.model");
const {
  isPastAppointment,
  isValidTimeSlot,
  isWithinBusinessHours,
  businessHoursMessage,
} = require("../utils/datetime");

/**
 * Crear una nueva cita
 * Reglas:
 * - No permite campos vacíos
 * - No permite fechas/horas pasadas
 * - Domingo cerrado
 * - Horario L-S 09:00-20:00, última cita 19:30 (duración 30 min)
 * - Turnos solo cada 30 minutos
 * - BD evita doble reserva por índices únicos
 */
exports.createAppointment = async (req, res) => {
  try {
    const { clientName, barberName, service, date, time } = req.body;

    if (
      !clientName?.trim() ||
      !barberName?.trim() ||
      !service?.trim() ||
      !date?.trim() ||
      !time?.trim()
    ) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios y no pueden estar vacíos",
      });
    }

    const finalDate = date.trim();
    const finalTime = time.trim();

    if (isPastAppointment(finalDate, finalTime)) {
      return res.status(400).json({
        message: "No se permiten citas en fechas/horas pasadas",
      });
    }

    // ✅ Solo turnos cada 30 minutos
    if (!isValidTimeSlot(finalTime)) {
      return res.status(400).json({
        message: "Hora inválida: solo se permiten turnos cada 30 minutos",
      });
    }

    // ✅ Horario (incluye domingo cerrado + última cita 19:30)
    if (!isWithinBusinessHours(finalDate, finalTime)) {
      return res.status(400).json({
        message: `Fuera del horario de atención. ${businessHoursMessage(
          finalDate
        )}`,
      });
    }

    const appointment = await Appointment.create({
      clientName: clientName.trim(),
      barberName: barberName.trim(),
      service: service.trim(),
      date: finalDate,
      time: finalTime,
    });

    return res.status(201).json(appointment);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "Ya existe una cita con el mismo cliente o barbero en esa fecha y hora",
      });
    }

    return res.status(500).json({
      message: "Error al crear la cita",
      error: error.message,
    });
  }
};

/**
 * Obtener todas las citas
 */
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ date: 1, time: 1 });
    return res.json(appointments);
  } catch (error) {
    return res.status(500).json({
      message: "Error obteniendo citas",
      error: error.message,
    });
  }
};

/**
 * Obtener una cita por ID:
 * - appointmentId (número) o _id (ObjectId)
 */
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    let appointment;
    if (!isNaN(id)) {
      appointment = await Appointment.findOne({ appointmentId: Number(id) });
    } else {
      appointment = await Appointment.findById(id);
    }

    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    return res.json(appointment);
  } catch (error) {
    return res.status(400).json({
      message: "Error buscando la cita",
      error: error.message,
    });
  }
};

/**
 * Actualizar una cita (incluye status)
 * Reglas:
 * - No permitir campos vacíos si se envían
 * - Si cambian date/time:
 *   - no pasado
 *   - turnos cada 30 min
 *   - horario válido (último turno 19:30)
 */
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, barberName, service, date, time, status } = req.body;

    const validStatus = ["ACTIVA", "CANCELADA"];

    const invalid =
      (clientName !== undefined && !String(clientName).trim()) ||
      (barberName !== undefined && !String(barberName).trim()) ||
      (service !== undefined && !String(service).trim()) ||
      (date !== undefined && !String(date).trim()) ||
      (time !== undefined && !String(time).trim()) ||
      (status !== undefined && !validStatus.includes(status));

    if (invalid) {
      return res.status(400).json({
        message: "Datos inválidos o campos vacíos",
      });
    }

    // Buscar la cita actual (para completar date/time si solo envían uno)
    let current;
    if (!isNaN(id)) {
      current = await Appointment.findOne({ appointmentId: Number(id) });
    } else {
      current = await Appointment.findById(id);
    }

    if (!current) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    const finalDate = date !== undefined ? String(date).trim() : current.date;
    const finalTime = time !== undefined ? String(time).trim() : current.time;

    // Si cambian date o time, validar reglas
    if (date !== undefined || time !== undefined) {
      if (isPastAppointment(finalDate, finalTime)) {
        return res.status(400).json({
          message: "No se permite actualizar a fechas/horas pasadas",
        });
      }

      if (!isValidTimeSlot(finalTime)) {
        return res.status(400).json({
          message: "Hora inválida: solo se permiten turnos cada 30 minutos",
        });
      }

      if (!isWithinBusinessHours(finalDate, finalTime)) {
        return res.status(400).json({
          message: `Fuera del horario de atención. ${businessHoursMessage(
            finalDate
          )}`,
        });
      }
    }

    const updates = {};
    if (clientName !== undefined) updates.clientName = String(clientName).trim();
    if (barberName !== undefined)
      updates.barberName = String(barberName).trim();
    if (service !== undefined) updates.service = String(service).trim();
    if (date !== undefined) updates.date = finalDate;
    if (time !== undefined) updates.time = finalTime;
    if (status !== undefined) updates.status = status;

    let updated;
    if (!isNaN(id)) {
      updated = await Appointment.findOneAndUpdate(
        { appointmentId: Number(id) },
        { $set: updates },
        { new: true, runValidators: true }
      );
    } else {
      updated = await Appointment.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    if (!updated) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    return res.json(updated);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "Conflicto: ya existe una cita con ese cliente o barbero en esa fecha y hora",
      });
    }

    return res.status(400).json({
      message: "Error actualizando la cita",
      error: error.message,
    });
  }
};

/**
 * Eliminar una cita
 * - appointmentId (número) o _id (ObjectId)
 */
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    let deleted;
    if (!isNaN(id)) {
      deleted = await Appointment.findOneAndDelete({ appointmentId: Number(id) });
    } else {
      deleted = await Appointment.findByIdAndDelete(id);
    }

    if (!deleted) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    return res.json({
      message: "Cita eliminada correctamente",
      deleted,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Error eliminando la cita",
      error: error.message,
    });
  }
};