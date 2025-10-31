import connection from "../config/db.js";

// ✅ Listar todos los trabajadores
export const obtenerTrabajadores = (req, res) => {
  connection.query("SELECT * FROM trabajadores", (err, results) => {
    if (err) {
      console.error("❌ Error al obtener trabajadores:", err);
      return res.status(500).json({ message: "Error en el servidor" });
    }
    res.status(200).json(results);
  });
};

// ✅ Registrar un nuevo trabajador
export const crearTrabajador = (req, res) => {
  const { nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado } = req.body;
  if (!nombres || !apellidos || !dni) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  const sql = `
    INSERT INTO trabajadores (nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  connection.query(sql, [nombres, apellidos, dni, cargo, area, telefono, direccion, fecha_ingreso, estado], (err, result) => {
    if (err) {
      console.error("❌ Error al crear trabajador:", err);
      return res.status(500).json({ message: "Error al registrar trabajador" });
    }
    res.status(201).json({ message: "✅ Trabajador registrado correctamente", id: result.insertId });
  });
};

// ✅ Obtener un trabajador por ID
export const obtenerTrabajadorPorId = (req, res) => {
  const { id } = req.params;
  connection.query("SELECT * FROM trabajadores WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("❌ Error al buscar trabajador:", err);
      return res.status(500).json({ message: "Error en el servidor" });
    }
    if (results.length === 0) return res.status(404).json({ message: "Trabajador no encontrado" });
    res.status(200).json(results[0]);
  });
};

// ✅ Actualizar un trabajador
export const actualizarTrabajador = (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, cargo, area, telefono, direccion, estado } = req.body;

  const sql = `
    UPDATE trabajadores
    SET nombres=?, apellidos=?, cargo=?, area=?, telefono=?, direccion=?, estado=?
    WHERE id=?
  `;
  connection.query(sql, [nombres, apellidos, cargo, area, telefono, direccion, estado, id], (err) => {
    if (err) {
      console.error("❌ Error al actualizar trabajador:", err);
      return res.status(500).json({ message: "Error al actualizar trabajador" });
    }
    res.status(200).json({ message: "✅ Trabajador actualizado correctamente" });
  });
};

// ✅ Eliminar un trabajador
export const eliminarTrabajador = (req, res) => {
  const { id } = req.params;
  connection.query("DELETE FROM trabajadores WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("❌ Error al eliminar trabajador:", err);
      return res.status(500).json({ message: "Error al eliminar trabajador" });
    }
    res.status(200).json({ message: "🗑️ Trabajador eliminado correctamente" });
  });
};
