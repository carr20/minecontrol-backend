// backend/helpers/auditoria.helper.js
import connection from "../config/db.js";

export async function registrarAuditoria(req, modulo, accion, registroId, descripcion) {
  try {
    // datos enviados por el frontend
    const usuarioId = req.headers["x-usuario-id"] || null;
    const username = req.headers["x-usuario-username"] || null;
    const rolNombre = req.headers["x-rol-nombre"] || null;

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;

    const userAgent = req.headers["user-agent"] || null;

    await connection.query(
      `INSERT INTO auditoria
       (usuario_id, usuario_username, rol_nombre, modulo, accion,
        registro_afectado_id, descripcion, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        username,
        rolNombre,
        modulo,
        accion,
        registroId || null,
        descripcion || null,
        ip,
        userAgent
      ]
    );
  } catch (err) {
    console.error("❌ Error registrando auditoría:", err);
  }
}
