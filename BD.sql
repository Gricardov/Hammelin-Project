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
    porc_satis_obra DOUBLE NULL DEFAULT NULL,
    num_repor INT NULL DEFAULT 0,
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
    satisfaccion_porc DOUBLE NOT NULL,
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

-- 

-- Testear conexión
DELIMITER //
CREATE PROCEDURE test_connection ()
BEGIN
	SELECT 1 + 1 AS solution;
END; //
DELIMITER ;

-- Actualizar o registrar obras en BD
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
				INSERT INTO obras VALUES (V_ID_OBRA, V_OCID_OBRA, V_FECHA_OBRA, V_ENT_OBRA, V_DES_OBRA, V_LIC_ID_OBRA, V_LIC_DES_OBRA, V_LIC_VAL_OBRA, V_LIC_MON_OBRA, V_LIC_DOCS_OBRA, DEFAULT, DEFAULT, DEFAULT, DEFAULT);
            END;
		END IF;

		-- Incremento el contador
		SET i = i + 1;
    END WHILE;
    
    COMMIT;
END //
DELIMITER ;

-- Obtener obras desde BD
DELIMITER //
CREATE PROCEDURE obtener_obras()
BEGIN
	SELECT id_obra, ocid_obra, fecha, entidad, descripcion, licitacion_id, licitacion_des, licitacion_val, licitacion_mon, docs_json, porc_satis_obra, num_repor FROM obras ORDER BY fecha_creacion DESC;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE obtener_mejores_obras()
BEGIN
	SELECT id_obra, ocid_obra, fecha, entidad, descripcion, licitacion_id, licitacion_des, licitacion_val, licitacion_mon, docs_json, porc_satis_obra, num_repor FROM obras WHERE porc_satis_obra IS NOT NULL ORDER BY porc_satis_obra DESC, num_repor DESC;
END //
DELIMITER ;

-- Se activa cuando hay un reporte
DELIMITER //
CREATE TRIGGER tr_actualizar_porcentaje_satisfaccion_obra
AFTER INSERT
   ON reportes FOR EACH ROW
BEGIN
	DECLARE json_data JSON;

    SET json_data = fn_obtener_porc_satisfaccion_obra(NEW.id_obra);
	UPDATE obras SET porc_satis_obra = JSON_EXTRACT(json_data, '$.porcSatis'), num_repor = JSON_EXTRACT(json_data, '$.num_reg') WHERE id_obra = NEW.id_obra;
END; //
DELIMITER ;

-- Función para obtener el % de satisfacción con la obra
DELIMITER //
CREATE FUNCTION fn_obtener_porc_satisfaccion_obra(p_id_obra VARCHAR(255)) RETURNS JSON DETERMINISTIC
BEGIN
  DECLARE porcentaje DOUBLE;
  DECLARE suma_satis DOUBLE;
  DECLARE num_reg INT;
  
  SET num_reg = (SELECT COUNT(id) FROM reportes WHERE id_obra = p_id_obra);
  SET suma_satis = (SELECT SUM(satisfaccion_porc) FROM reportes where id_obra = p_id_obra);
  RETURN JSON_OBJECT('porcSatis', (suma_satis / num_reg), 'num_reg', num_reg);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE registrar_reporte(
	r_id_obra VARCHAR(255),
    r_nombres VARCHAR(255),
    r_apellidos VARCHAR(255),
    r_telefono VARCHAR(15),
    r_correo VARCHAR(255),
    r_observacion VARCHAR(500),
	r_satisfaccion_porc DOUBLE, 
    r_documentos JSON
)
BEGIN
	INSERT INTO reportes values (DEFAULT, r_id_obra, r_nombres, r_apellidos, r_telefono, r_correo, r_observacion, r_satisfaccion_porc, r_documentos, DEFAULT, DEFAULT);
END //
DELIMITER ;

-- --------------------

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

-- -----------
drop table obras;
SET SQL_SAFE_UPDATES = 0;
delete from obras where entidad != '';
select*from obras;
select*from reportes;
select count(*) from obras;
INSERT INTO consulta_personas VALUES (DEFAULT, 'Mila', 'Luna', 'SURCO', 'LIMA', 'LIMA', '999999999', TRUE, DEFAULT, DEFAULT);
SELECT*FROM consulta_personas;
delete from consulta_personas where id= 1;
-- ---------------------------