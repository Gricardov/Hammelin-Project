SET GLOBAL time_zone = '+00:00';
SET GLOBAL log_bin_trust_function_creators = 1;
SET time_zone='+00:00';
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET CHARACTER_SET_SERVER = utf8mb4;
SET COLLATION_SERVER = utf8mb4_unicode_ci;

CREATE DATABASE HAMMELIN_DB;

USE HAMMELIN_DB;

CREATE TABLE IF NOT EXISTS obras (
	id_obra VARCHAR(255) PRIMARY KEY,
    ocid_obra VARCHAR(255) NOT NULL,
    fecha DATETIME NOT NULL,
    entidad VARCHAR(255) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    licitacion_id VARCHAR(50) NOT NULL,
    licitacion_des VARCHAR(500) NOT NULL,
    licitacion_val DOUBLE NOT NULL,
    licitacion_mon VARCHAR(50) NOT NULL,
    docs_json JSON NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reportes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_obra VARCHAR(255) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
	apellidos VARCHAR(255) NOT NULL,
    telefono VARCHAR(15),
    correo VARCHAR(255),
    observacion VARCHAR(500),
    satisfaccion_porc INT NOT NULL,
    docs_json JSON,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE reportes
ADD FOREIGN KEY (id_obra) REFERENCES obras(id_obra);

CREATE TABLE IF NOT EXISTS consulta_personas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    distrito VARCHAR(255),
    provincia VARCHAR(255),
    region VARCHAR(255),
    telefono VARCHAR(20),
    autoriza BOOLEAN NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO consulta_personas VALUES (DEFAULT, 'Mila', 'Luna', 'SURCO', 'LIMA', 'LIMA', '999999999', TRUE, DEFAULT, DEFAULT);
SELECT*FROM consulta_personas;
delete from consulta_personas where id= 1;
-- ---------------------------

-- Testear conexión
DROP PROCEDURE IF EXISTS USP_TEST_CONNECTION;
DELIMITER //
CREATE PROCEDURE USP_TEST_CONNECTION ()
BEGIN
	SELECT 1 + 1 AS solution;
END; //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE actualizar_registrar_obras(obras JSON)
BEGIN
    -- Declaración de variables
	DECLARE i INT DEFAULT 0;
    DECLARE V_NUM_ROWS INT;
    DECLARE V_ID_OBRA VARCHAR(255);
    DECLARE V_OCID_OBRA VARCHAR(255);
    DECLARE V_FECHA_OBRA DATETIME;
    DECLARE V_ENT_OBRA VARCHAR(255);
    DECLARE V_DES_OBRA VARCHAR(500);
    DECLARE V_LIC_ID_OBRA VARCHAR(50);
    DECLARE V_LIC_DES_OBRA VARCHAR(500);
    DECLARE V_LIC_VAL_OBRA DOUBLE;
    DECLARE V_LIC_MON_OBRA VARCHAR(50);
    DECLARE V_LIC_DOCS_OBRA JSON;
    
    -- Hace rollback a las transacciones si algo malo sucede
	DECLARE exit handler FOR SQLEXCEPTION
	BEGIN
		ROLLBACK;
		RESIGNAL;
	END;
    
    START TRANSACTION;
    -- Obtengo la longitud del array
    SET V_NUM_ROWS = JSON_LENGTH(obras);
    
    -- Itero el array
    WHILE i < V_NUM_ROWS DO

		-- Extraigo los campos
        SET V_ID_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].id')));
        SET V_OCID_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].ocid')));
		SET V_FECHA_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].date')));
		SET V_ENT_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].buyer')));
		SET V_DES_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].tender.name')));
		SET V_LIC_ID_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].tender.id')));
		SET V_LIC_DES_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].tender.name')));
		SET V_LIC_VAL_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].tender.value')));
		SET V_LIC_MON_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].tender.currency')));
		SET V_LIC_DOCS_OBRA = JSON_UNQUOTE(JSON_EXTRACT(obras, CONCAT('$[', i, '].documents')));
        
        IF (NOT(EXISTS(SELECT id_obra FROM obras WHERE id_obra = V_ID_OBRA))) THEN
			BEGIN
				INSERT INTO obras VALUES (V_ID_OBRA, V_OCID_OBRA, V_FECHA_OBRA, V_ENT_OBRA, V_DES_OBRA, V_LIC_ID_OBRA, V_LIC_DES_OBRA, V_LIC_VAL_OBRA, V_LIC_MON_OBRA, V_LIC_DOCS_OBRA);
            END;
		END IF;

		-- Incremento el contador
		SET i = i + 1;
    END WHILE;
    
    COMMIT;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE registrar_reporte(
    IN r_telefono VARCHAR(20),
    IN r_correo VARCHAR(255),
    IN r_observacion TEXT,
    IN r_documentos JSON
)
BEGIN
    INSERT INTO reportes (nombres_apellidos, telefono, correo, observacion, documentos)
    VALUES (r_nombres, r_apellidos, r_telefono, r_correo, r_observacion, r_documentos);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE registrar_consulta(
    IN c_nombres VARCHAR(255),
    IN c_apellidos VARCHAR(255),
    IN c_distrito VARCHAR(255),
    IN c_provincia VARCHAR(255),
    IN c_region VARCHAR(255),
    IN c_telefono VARCHAR(20),
    IN c_autorizacion VARCHAR(50)
)
BEGIN
    INSERT INTO consulta (nombres, apellidos, distrito, provincia, region, telefono, autorizacion)
    VALUES (c_nombres, c_apellidos, c_distrito, c_provincia, c_region, c_telefono, c_autorizacion);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE obtener_consulta_por_id(
    IN c_id INT,
    OUT c_nombres VARCHAR(255),
    OUT c_apellidos VARCHAR(255),
    OUT c_distrito VARCHAR(255),
    OUT c_provincia VARCHAR(255),
    OUT c_region VARCHAR(255),
    OUT p_telefono VARCHAR(20),
    OUT c_autorizacion VARCHAR(50)
)
BEGIN
    SELECT
        nombres,
        apellidos,
        distrito,
        provincia,
        region,
        telefono,
        autorizacion
    INTO
        c_nombres,
        c_apellidos,
        c_distrito,
        c_provincia,
        c_region,
        c_telefono,
        c_autorizacion
    FROM
        consulta
    WHERE
        id = c_id;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE actualizar_consulta_por_id(
    IN c_id INT,
    IN c_nombres VARCHAR(255),
    IN c_apellidos VARCHAR(255),
    IN c_distrito VARCHAR(255),
    IN c_provincia VARCHAR(255),
    IN c_region VARCHAR(255),
    IN p_telefono VARCHAR(20),
    IN c_autorizacion VARCHAR(50)
)
BEGIN
    UPDATE consulta
    SET
        nombres = c_nombres,
        apellidos = c_apellidos,
        distrito = c_distrito,
        provincia = c_provincia,
        region = c_region,
        telefono = c_telefono,
        autorizacion = c_autorizacion
    WHERE
        id = c_id;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE eliminar_consulta_por_id(
    IN c_id INT
)
BEGIN
    DELETE FROM consulta
    WHERE
        id = c_id;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE obtener_todas_las_consultas()
BEGIN
    SELECT * FROM consulta;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE buscar_consultas_por_nombres(
    IN c_nombres VARCHAR(255)
)
BEGIN
    SELECT * FROM consulta
    WHERE nombres LIKE CONCAT('%', c_nombres, '%');
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE contar_consultas(
    OUT c_cantidad INT
)
BEGIN
    SELECT COUNT(*) INTO c_cantidad FROM consulta;
END //
DELIMITER ;