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
    const [rows] = await connection.query("SELECT * FROM asistencias WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Asistencia no encontrada" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener asistencia:", error);
    res.status(500).json({ error: "Error al obtener asistencia" });
  }
});

// ✅ Crear una nueva asistencia
router.post("/", async (req, res) => {
  try {
    const { id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado, observaciones } = req.body;

    await connection.query(
      `INSERT INTO asistencias (id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado, observaciones]
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
    const { id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado, observaciones } = req.body;

    await connection.query(
      `UPDATE asistencias 
       SET id_trabajador=?, fecha=?, hora_entrada=?, hora_salida=?, metodo_marcado=?, estado=?, observaciones=?
       WHERE id=?`,
      [id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado, observaciones, req.params.id]
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
    await connection.query("DELETE FROM asistencias WHERE id = ?", [req.params.id]);
    res.json({ message: "🗑️ Asistencia eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar asistencia:", error);
    res.status(500).json({ error: "Error al eliminar asistencia" });
  }
});

export default router;
