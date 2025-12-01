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
    const [rows] = await connection.query(
      "SELECT * FROM registro_maquinaria WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Registro no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener registro:", error);
    res.status(500).json({ error: "Error al obtener registro de maquinaria" });
  }
});

// ✅ Crear un nuevo registro de maquinaria
router.post("/", async (req, res) => {
  try {
    const {
      id_maquinaria,
      id_trabajador,
      fecha,
      hora_entrada,
      hora_salida,
      tipo_trabajo,
      toneladas_movidas,
      operador_nombre,
      observaciones,
    } = req.body;

    await connection.query(
      `INSERT INTO registro_maquinaria 
      (id_maquinaria, id_trabajador, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_maquinaria,
        id_trabajador,
        fecha,
        hora_entrada,
        hora_salida,
        tipo_trabajo,
        toneladas_movidas,
        operador_nombre,
        observaciones,
      ]
    );

    res
      .status(201)
      .json({ message: "✅ Registro de maquinaria creado correctamente" });
  } catch (error) {
    console.error("Error al crear registro:", error);
    res.status(500).json({ error: "Error al crear registro de maquinaria" });
  }
});

// ✅ Actualizar un registro
router.put("/:id", async (req, res) => {
  try {
    const {
      id_maquinaria,
      id_trabajador,
      fecha,
      hora_entrada,
      hora_salida,
      tipo_trabajo,
      toneladas_movidas,
      operador_nombre,
      observaciones,
    } = req.body;

    await connection.query(
      `UPDATE registro_maquinaria 
      SET id_maquinaria=?, id_trabajador=?, fecha=?, hora_entrada=?, hora_salida=?, tipo_trabajo=?, toneladas_movidas=?, operador_nombre=?, observaciones=? 
      WHERE id=?`,
      [
        id_maquinaria,
        id_trabajador,
        fecha,
        hora_entrada,
        hora_salida,
        tipo_trabajo,
        toneladas_movidas,
        operador_nombre,
        observaciones,
        req.params.id,
      ]
    );

    res.json({
      message: "✅ Registro de maquinaria actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar registro:", error);
    res.status(500).json({ error: "Error al actualizar registro de maquinaria" });
  }
});

// ✅ Eliminar un registro
router.delete("/:id", async (req, res) => {
  try {
    await connection.query("DELETE FROM registro_maquinaria WHERE id = ?", [
      req.params.id,
    ]);
    res.json({
      message: "🗑️ Registro de maquinaria eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar registro:", error);
    res.status(500).json({ error: "Error al eliminar registro de maquinaria" });
  }
});



// ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
//      🚜 MARCAR ENTRADA / SALIDA
// ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐

router.post("/marcar", async (req, res) => {
  try {
    const {
      id_maquinaria,
      tipo,
      tipo_marca,
      tipo_trabajo,
      toneladas_movidas,
      operador_nombre,
      observaciones,
    } = req.body;

    const marca = (tipo || tipo_marca || "").toLowerCase();

    if (!id_maquinaria || !marca) {
      return res.status(400).json({
        message: "id_maquinaria y tipo (entrada/salida) son obligatorios.",
      });
    }

    // -------------------- ENTRADA ---------------------
    if (marca === "entrada") {
      // 🔒 Verificar si YA existe un registro ABIERTO (sin hora_salida)
      const [abiertos] = await connection.query(
        `SELECT id
         FROM registro_maquinaria
         WHERE id_maquinaria = ?
           AND hora_salida IS NULL
         ORDER BY id DESC
         LIMIT 1`,
        [id_maquinaria]
      );

      if (abiertos.length > 0) {
        return res.status(400).json({
          message:
            "Esta maquinaria ya tiene una ENTRADA sin SALIDA. Registre la salida antes de una nueva entrada.",
        });
      }

      // Si no hay registro abierto, se registra la ENTRADA
      await connection.query(
        `INSERT INTO registro_maquinaria
        (id_maquinaria, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones)
        VALUES (?, CURDATE(), CURTIME(), NULL, ?, ?, ?, ?)`,
        [
          id_maquinaria,
          tipo_trabajo || null,
          toneladas_movidas != null ? toneladas_movidas : null,
          operador_nombre || null,
          observaciones || null,
        ]
      );

      return res.json({
        message: "✅ Entrada de maquinaria registrada correctamente.",
      });
    }

    // -------------------- SALIDA ---------------------
    if (marca === "salida") {
      // Buscar registro abierto (sin hora_salida)
      const [rows] = await connection.query(
        `SELECT id FROM registro_maquinaria
         WHERE id_maquinaria = ?
           AND hora_salida IS NULL
         ORDER BY id DESC
         LIMIT 1`,
        [id_maquinaria]
      );

      if (rows.length === 0) {
        return res.status(400).json({
          message:
            "No existe un registro de ENTRADA sin cerrar. Registre entrada primero.",
        });
      }

      const registroId = rows[0].id;

      await connection.query(
        `UPDATE registro_maquinaria
         SET hora_salida = CURTIME(),
             tipo_trabajo = COALESCE(?, tipo_trabajo),
             toneladas_movidas = COALESCE(?, toneladas_movidas),
             operador_nombre = COALESCE(?, operador_nombre),
             observaciones = COALESCE(?, observaciones)
         WHERE id = ?`,
        [
          tipo_trabajo || null,
          toneladas_movidas != null ? toneladas_movidas : null,
          operador_nombre || null,
          observaciones || null,
          registroId,
        ]
      );

      return res.json({
        message: "✅ Salida de maquinaria registrada correctamente.",
      });
    }

    return res.status(400).json({
      message: "El tipo debe ser 'entrada' o 'salida'.",
    });
  } catch (error) {
    console.error("Error en /marcar:", error);
    res.status(500).json({ error: "Error al marcar movimiento" });
  }
});

// ⭐ FIN DE LA RUTA NUEVA ⭐

export default router;

