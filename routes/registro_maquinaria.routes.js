import express from "express";
import connection from "../config/db.js";

const router = express.Router();

// ✅ Obtener todos los registros de maquinaria
router.get("/", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM registro_maquinaria");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener registros:", error);
    res.status(500).json({ error: "Error al obtener registros de maquinaria" });
  }
});

// ✅ Obtener un registro por ID
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM registro_maquinaria WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Registro no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener registro:", error);
    res.status(500).json({ error: "Error al obtener registro de maquinaria" });
  }
});

// ✅ Crear un nuevo registro de maquinaria
router.post("/", async (req, res) => {
  try {
    const { id_maquinaria, id_trabajador, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones } = req.body;
    await connection.query(
      `INSERT INTO registro_maquinaria 
      (id_maquinaria, id_trabajador, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_maquinaria, id_trabajador, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones]
    );
    res.status(201).json({ message: "✅ Registro de maquinaria creado correctamente" });
  } catch (error) {
    console.error("Error al crear registro:", error);
    res.status(500).json({ error: "Error al crear registro de maquinaria" });
  }
});

// ✅ Actualizar un registro
router.put("/:id", async (req, res) => {
  try {
    const { id_maquinaria, id_trabajador, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones } = req.body;
    await connection.query(
      `UPDATE registro_maquinaria 
      SET id_maquinaria=?, id_trabajador=?, fecha=?, hora_entrada=?, hora_salida=?, tipo_trabajo=?, toneladas_movidas=?, operador_nombre=?, observaciones=? 
      WHERE id=?`,
      [id_maquinaria, id_trabajador, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones, req.params.id]
    );
    res.json({ message: "✅ Registro de maquinaria actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar registro:", error);
    res.status(500).json({ error: "Error al actualizar registro de maquinaria" });
  }
});

// ✅ Eliminar un registro
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM registro_maquinaria WHERE id = ?", [req.params.id]);
    res.json({ message: "🗑️ Registro de maquinaria eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar registro:", error);
    res.status(500).json({ error: "Error al eliminar registro de maquinaria" });
  }
});

export default router;
