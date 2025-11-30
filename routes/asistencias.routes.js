import express from "express";
import connection from "../config/db.js";

const router = express.Router();

// ✅ Obtener todas las asistencias
router.get("/", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM asistencias");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener asistencias:", error);
    res.status(500).json({ error: "Error al obtener asistencias" });
  }
});

// ✅ Obtener una asistencia por ID
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await connection.query(
      "SELECT * FROM asistencias WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Asistencia no encontrada" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener asistencia:", error);
    res.status(500).json({ error: "Error al obtener asistencia" });
  }
});

/* ✅ NUEVO: Marcar ENTRADA o SALIDA automáticamente
   Body esperado:
   {
     "id_trabajador": 3,
     "tipo": "entrada" | "salida",
     "metodo_marcado": "manual" | "QR" | "biometrico" (opcional, default manual)
   }
*/
router.post("/marcar", async (req, res) => {
  try {
    const { id_trabajador, tipo, metodo_marcado } = req.body;

    if (!id_trabajador || !tipo) {
      return res
        .status(400)
        .json({ message: "id_trabajador y tipo son obligatorios." });
    }

    const metodo = metodo_marcado || "manual";

    if (tipo === "entrada") {
      // ¿Ya tiene una entrada hoy sin salida?
      const [existentes] = await connection.query(
        `SELECT id 
         FROM asistencias 
         WHERE id_trabajador = ? 
           AND fecha = CURDATE() 
           AND estado = 'Dentro'
         LIMIT 1`,
        [id_trabajador]
      );

      if (existentes.length > 0) {
        return res.status(400).json({
          message:
            "El trabajador ya registró una entrada hoy y aún figura como 'Dentro'.",
        });
      }

      // Registrar nueva entrada
      await connection.query(
        `INSERT INTO asistencias 
         (id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado, observaciones)
         VALUES (?, CURDATE(), CURTIME(), NULL, ?, 'Dentro', NULL)`,
        [id_trabajador, metodo]
      );

      return res.json({ message: "Entrada registrada correctamente." });
    }

    if (tipo === "salida") {
      // Buscar la última entrada de hoy que siga "Dentro"
      const [registros] = await connection.query(
        `SELECT id 
         FROM asistencias
         WHERE id_trabajador = ?
           AND fecha = CURDATE()
           AND estado = 'Dentro'
           AND hora_entrada IS NOT NULL
           AND (hora_salida IS NULL OR hora_salida = '00:00:00')
         ORDER BY id DESC
         LIMIT 1`,
        [id_trabajador]
      );

      if (registros.length === 0) {
        return res.status(400).json({
          message:
            "No hay una entrada previa hoy para este trabajador. No se puede marcar salida.",
        });
      }

      const idAsistencia = registros[0].id;

      await connection.query(
        `UPDATE asistencias
         SET hora_salida = CURTIME(), estado = 'Fuera'
         WHERE id = ?`,
        [idAsistencia]
      );

      return res.json({ message: "Salida registrada correctamente." });
    }

    return res.status(400).json({
      message: "Tipo de marca inválido. Debe ser 'entrada' o 'salida'.",
    });
  } catch (error) {
    console.error("Error al marcar asistencia:", error);
    res.status(500).json({ error: "Error al marcar asistencia" });
  }
});

// ✅ Crear una nueva asistencia (uso genérico/manual)
router.post("/", async (req, res) => {
  try {
    const {
      id_trabajador,
      fecha,
      hora_entrada,
      hora_salida,
      metodo_marcado,
      estado,
      observaciones,
    } = req.body;

    await connection.query(
      `INSERT INTO asistencias 
       (id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_trabajador,
        fecha,
        hora_entrada,
        hora_salida,
        metodo_marcado,
        estado,
        observaciones,
      ]
    );

    res.status(201).json({ message: "✅ Asistencia registrada correctamente" });
  } catch (error) {
    console.error("Error al registrar asistencia:", error);
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
});

// ✅ Actualizar una asistencia
router.put("/:id", async (req, res) => {
  try {
    const {
      id_trabajador,
      fecha,
      hora_entrada,
      hora_salida,
      metodo_marcado,
      estado,
      observaciones,
    } = req.body;

    await connection.query(
      `UPDATE asistencias 
       SET id_trabajador=?, fecha=?, hora_entrada=?, hora_salida=?, metodo_marcado=?, estado=?, observaciones=?
       WHERE id=?`,
      [
        id_trabajador,
        fecha,
        hora_entrada,
        hora_salida,
        metodo_marcado,
        estado,
        observaciones,
        req.params.id,
      ]
    );

    res.json({ message: "✅ Asistencia actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar asistencia:", error);
    res.status(500).json({ error: "Error al actualizar asistencia" });
  }
});

// ✅ Eliminar una asistencia
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM asistencias WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "🗑️ Asistencia eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar asistencia:", error);
    res.status(500).json({ error: "Error al eliminar asistencia" });
  }
});

export default router;
