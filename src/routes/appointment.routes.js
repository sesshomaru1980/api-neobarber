const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/appointment.controller");

/**
 * Base: /api/appointments
 */

router.post("/", appointmentController.createAppointment);
router.get("/", appointmentController.getAppointments);
router.get("/:id", appointmentController.getAppointmentById);
router.put("/:id", appointmentController.updateAppointment);
router.delete("/:id", appointmentController.deleteAppointment);

module.exports = router;