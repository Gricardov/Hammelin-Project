const { queryDB } = require('../database/pool');
require('custom-env').env();

const registerReport = async (req, res) => {
  try {
    const { idObra, nombres, apellidos, telefono, correo, observacion, satisfaccionPorc, docsJson } = req.body;
    await queryDB('CALL registrar_reporte(?,?,?,?,?,?,?,?)', [idObra, nombres, apellidos, telefono, correo, observacion, satisfaccionPorc, JSON.stringify(docsJson)]);
    res.setHeader("Content-Type", "application/json");
    res.json({ message: 'Reporte registrado exitosamente' });
  } catch (error) {
    console.log('No se pudo registrar el reporte: ', error);
    res.status(500).json({ message: 'No se pudo registrar el reporte' });
  }
}

module.exports = {
  registerReport
}