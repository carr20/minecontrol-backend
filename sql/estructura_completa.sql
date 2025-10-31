-- ESTRUCTURA COMPLETA: MineControl Perú
-- Base de datos y tablas (Fase 2 final)
CREATE DATABASE IF NOT EXISTS `minecontrol_peru` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `minecontrol_peru`;

-- Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla: usuarios (independiente de trabajadores)
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  id_rol INT NOT NULL,
  estado ENUM('activo','inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_rol) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla: trabajadores
CREATE TABLE IF NOT EXISTS trabajadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  dni VARCHAR(20) NOT NULL UNIQUE,
  cargo VARCHAR(100),
  area VARCHAR(100),
  telefono VARCHAR(30),
  direccion VARCHAR(255),
  fecha_ingreso DATE,
  estado ENUM('activo','inactivo') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla: documentos_trabajador
CREATE TABLE IF NOT EXISTS documentos_trabajador (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_trabajador INT NOT NULL,
  tipo_documento ENUM('DNI','Antecedentes Penales','Antecedentes Policiales','Contrato','Certificado Salud','Otro') NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(255) NOT NULL,
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_trabajador) REFERENCES trabajadores(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla: maquinarias
CREATE TABLE IF NOT EXISTS maquinarias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  tipo VARCHAR(80),
  marca VARCHAR(80),
  modelo VARCHAR(80),
  placa VARCHAR(50),
  estado ENUM('operativa','mantenimiento','inactiva') DEFAULT 'operativa',
  fecha_registro DATE,
  horas_acumuladas DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla: registro_maquinaria (entradas/salidas/actividades)
CREATE TABLE IF NOT EXISTS registro_maquinaria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_maquinaria INT NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME DEFAULT NULL,
  hora_salida TIME DEFAULT NULL,
  tipo_trabajo ENUM('extraccion','transporte','desmonte','mantenimiento','otro') DEFAULT 'otro',
  toneladas_movidas DECIMAL(12,3) DEFAULT 0,
  operador_nombre VARCHAR(150),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_maquinaria) REFERENCES maquinarias(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla: asistencias
CREATE TABLE IF NOT EXISTS asistencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_trabajador INT NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME DEFAULT NULL,
  hora_salida TIME DEFAULT NULL,
  metodo_marcado ENUM('QR','manual','biometrico') DEFAULT 'QR',
  estado ENUM('Dentro','Fuera') DEFAULT 'Fuera',
  observaciones VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_trabajador) REFERENCES trabajadores(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_trabajadores_cargo ON trabajadores(cargo);
CREATE INDEX IF NOT EXISTS idx_trabajadores_area ON trabajadores(area);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_regmaq_fecha ON registro_maquinaria(fecha);

-- Datos iniciales (roles y usuario admin)
INSERT INTO roles (nombre, descripcion) VALUES
  ('Administrador','Acceso completo al sistema'),
  ('Supervisor','Supervisa personal y maquinaria'),
  ('Operario','Usuario operativo, sin acceso al panel'),
  ('Seguridad','Personal de seguridad, acceso limitado');

-- Usuario administrador de prueba (contraseña en texto para pruebas: 123456)
-- Se recomienda cambiar por hash en producción.
INSERT INTO usuarios (username, email, password, id_rol) VALUES
  ('admin','admin@minecontrol.com','123456', 1),
  ('supervisor','supervisor@minecontrol.com','123456', 2);

-- Datos de ejemplo para trabajadores
INSERT INTO trabajadores (nombres, apellidos, dni, cargo, area, telefono, fecha_ingreso, estado) VALUES
  ('Juan','Pérez', '72893412','Operario','Extracción','958324621','2025-05-02','activo'),
  ('Luis','Ramos', '71382649','Chofer','Transporte','958112233','2025-03-14','activo'),
  ('Carlos','Quispe', '71983764','Ayudante','Mantenimiento','958776655','2024-12-01','inactivo');

-- Documentos ejemplo
INSERT INTO documentos_trabajador (id_trabajador, tipo_documento, nombre_archivo, ruta_archivo) VALUES
  (1,'DNI','dni_juan.pdf','uploads/trabajadores/1/dni_juan.pdf'),
  (1,'Antecedentes Penales','penales_juan.pdf','uploads/trabajadores/1/penales_juan.pdf'),
  (2,'DNI','dni_luis.pdf','uploads/trabajadores/2/dni_luis.pdf');

-- Maquinarias ejemplo
INSERT INTO maquinarias (codigo, nombre, tipo, marca, modelo, placa, estado, fecha_registro) VALUES
  ('M-001','Retroexcavadora 320D','Excavadora','Caterpillar','320D','CAT-4215','operativa','2024-01-10'),
  ('M-002','Camión Volquete','Transporte','Volvo','FMX','VOL-8721','operativa','2024-06-15');

-- Registros de maquinaria ejemplo
INSERT INTO registro_maquinaria (id_maquinaria, fecha, hora_entrada, hora_salida, tipo_trabajo, toneladas_movidas, operador_nombre, observaciones) VALUES
  (1,'2025-10-10','07:45:00','16:30:00','desmonte',12.500,'Julio Ramos','Jornada normal'),
  (1,'2025-10-11','07:40:00','16:10:00','extraccion',10.250,'Julio Ramos','Frente 4'),
  (2,'2025-10-11','08:00:00','15:45:00','transporte',8.000,'Luis Ramos','Transporte a planta');

-- Asistencias ejemplo
INSERT INTO asistencias (id_trabajador, fecha, hora_entrada, hora_salida, metodo_marcado, estado) VALUES
  (1,'2025-10-10','07:10:00','16:10:00','QR','Fuera'),
  (2,'2025-10-10','07:30:00','18:05:00','QR','Fuera');

-- Fin del script
