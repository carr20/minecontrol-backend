import express from "express";
import connection from "../config/db.js";

// ⭐ NUEVO: helper de auditoría (solo se agrega, no rompe nada)
import { registrarAuditoria } from "../helpers/auditoria.helper.js";

const router = express.Router();


// ✅ 1. Obtener todos los trabajadores
router.get("/", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT * FROM trabajadores");
    res.json(rows);
  } catch (error) {
    console.error("❌ Error al obtener trabajadores:", error);
    res.status(500).json({ error: "Error al obtener trabajadores" });
  }
});


// ✅ 2. Obtener un trabajador por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await connection.query("SELECT * FROM trabajadores WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener trabajador:", error);
    res.status(500).json({ error: "Error al obtener trabajador" });
  }
});


// ✅ 3. Agregar nuevo trabajador
router.post("/", async (req, res) => {
  const { nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado } = req.body;
  try {
    const [result] = await connection.query(
      `INSERT INTO trabajadores (nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado]
    );

    // 📝 AUDITORÍA (no afecta la respuesta aunque falle)
    try {
      registrarAuditoria(req, {
        modulo: "trabajadores",
        accion: "CREAR",
        registroAfectadoId: result.insertId || null,
        descripcion: `Se creó trabajador DNI ${dni || ""}`,
      });
    } catch (e) {
      console.error("Error registrando auditoría (crear trabajador):", e);
    }

    res.status(201).json({ message: "✅ Trabajador agregado correctamente", id: result.insertId });
  } catch (error) {
    console.error("❌ Error al agregar trabajador:", error);
    res.status(500).json({ error: "Error al agregar trabajador" });
  }
});


// ✅ 4. Actualizar trabajador
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado } = req.body;
  try {
    const [result] = await connection.query(
      `UPDATE trabajadores SET nombres=?, apellidos=?, dni=?, cargo=?, area=?, telefono=?, direccion=?, fecha_ingreso=?, estado=? WHERE id=?`,
      [nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // 📝 AUDITORÍA
    try {
      registrarAuditoria(req, {
        modulo: "trabajadores",
        accion: "ACTUALIZAR",
        registroAfectadoId: Number(id),
        descripcion: `Se actualizó trabajador DNI ${dni || ""}`,
      });
    } catch (e) {
      console.error("Error registrando auditoría (actualizar trabajador):", e);
    }

    res.json({ message: "✅ Trabajador actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar trabajador:", error);
    res.status(500).json({ error: "Error al actualizar trabajador" });
  }
});


// ✅ 5. Eliminar trabajador
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await connection.query("DELETE FROM trabajadores WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // 📝 AUDITORÍA
    try {
      registrarAuditoria(req, {
        modulo: "trabajadores",
        accion: "ELIMINAR",
        registroAfectadoId: Number(id),
        descripcion: `Se eliminó trabajador con ID ${id}`,
      });
    } catch (e) {
      console.error("Error registrando auditoría (eliminar trabajador):", e);
    }

    res.json({ message: "🗑️ Trabajador eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar trabajador:", error);
    res.status(500).json({ error: "Error al eliminar trabajador" });
  }
});


export default router;

