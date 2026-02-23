/**
 * Utilidades de fecha/hora para validar citas.
 * date: "YYYY-MM-DD"
 * time: "HH:mm"
 *
 * Reglas:
 * - Lunes a Sábado: 09:00 - 20:00 (cierre)
 * - Domingo: cerrado
 * - Duración cita: 30 minutos
 * - Último inicio permitido: 19:30 (para terminar a 20:00)
 * - Solo se permiten bloques cada 30 minutos
 */

const APPOINTMENT_DURATION_MIN = 30;

function toDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function timeToMinutes(time) {
  const [hh, mm] = String(time).split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
  return hh * 60 + mm;
}

/**
 * True si está en el pasado o si no parsea bien
 */
function isPastAppointment(date, time) {
  const dt = toDateTime(date, time);
  if (Number.isNaN(dt.getTime())) return true;
  return dt.getTime() < Date.now();
}

/**
 * Solo permite turnos cada 30 minutos
 * Ej: 09:00, 09:30, 10:00, 10:30...
 */
function isValidTimeSlot(timeStr) {
  const minutes = timeToMinutes(timeStr);
  if (Number.isNaN(minutes)) return false;
  return minutes % APPOINTMENT_DURATION_MIN === 0; // múltiplo de 30
}

/**
 * Valida horario:
 * - L-S abierto
 * - Domingo cerrado
 * - Inicio permitido tal que (inicio + duración) <= cierre
 */
function isWithinBusinessHours(dateStr, timeStr) {
  const dt = toDateTime(dateStr, timeStr);
  if (Number.isNaN(dt.getTime())) return false;

  const day = dt.getDay(); // 0 domingo, 6 sábado

  // ❌ Domingo cerrado
  if (day === 0) return false;

  const start = 9 * 60; // 09:00
  const close = 20 * 60; // 20:00 (cierre)

  const startMinutes = timeToMinutes(timeStr);
  if (Number.isNaN(startMinutes)) return false;

  // Debe iniciar dentro del horario de apertura
  if (startMinutes < start) return false;

  // Debe terminar antes o justo al cierre
  const endMinutes = startMinutes + APPOINTMENT_DURATION_MIN;
  if (endMinutes > close) return false;

  return true;
}

function businessHoursMessage(dateStr) {
  const dt = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return "Fecha inválida";

  if (dt.getDay() === 0) return "Domingos no se labora";

  return "Horario L-S: 09:00 a 20:00. Último turno: 19:30. Turnos cada 30 min.";
}

module.exports = {
  APPOINTMENT_DURATION_MIN,
  toDateTime,
  isPastAppointment,
  isValidTimeSlot,
  isWithinBusinessHours,
  businessHoursMessage,
};