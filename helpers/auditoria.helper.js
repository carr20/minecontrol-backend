// helpers/auditoria.helper.js
import connection from "../config/db.js";

/**
 * Registra una acción en la tabla auditoria.
 *
 * NO interrumpe el funcionamiento del sistema si falla:
 * - No lanza errores
 * - No modifica la respuesta de los endpoints
 */
export function registrarAuditoria(req, detalle = {}) {
  try {
    // Usuario desde middleware o header
    const user = req.user || {};

    const usuario_id =
      user.id_usuario ||
      user.id ||
      (req.headers["x-user-id"] ? Number(req.headers["x-user-id"]) : null) ||
      null;

    const usuario_username =
      user.username ||
      user.usuario ||
      req.headers["x-user-name"] ||
      null;

    const rol_nombre =
      user.rol_nombre ||
      user.role ||
      req.headers["x-user-role"] ||
      null;

    const {
      modulo = null,
      accion = null,
      registroAfectadoId = null,
      descripcion = null,
    } = detalle;

    const ip = req.ip || null;
    const userAgent = req.get("user-agent") || null;

    const sql = `
      INSERT INTO auditoria
      (usuario_id, usuario_username, rol_nombre, modulo, accion,
       registro_afectado_id, descripcion, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      usuario_id,
      usuario_username,
      rol_nombre,
      modulo,
      accion,
      registroAfectadoId,
      descripcion,
      ip,
      userAgent,
    ];

    connection.query(sql, params, (err) => {
      if (err) {
        console.error("❌ Error al registrar auditoría:", err.message);
      }
      // NO interferimos con nada
    });
  } catch (e) {
    console.error("❌ Error inesperado en registrarAuditoria:", e);
  }
}
