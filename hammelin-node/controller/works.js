const { queryDB } = require('../database/pool');
const { getContractsFromReleases } = require('../utils/functions');
const { default: axios } = require('axios');
const moment = require('moment');
require('custom-env').env();

const updateWorks = async (req, res) => {
  try {
    // Obtengo las últimas obras
    const result = await axios.get(`https://contratacionesabiertas.osce.gob.pe/api/v1/releases?page=1&order=desc&sourceId=seace_v3&mainProcurementCategory=works`, {
      headers: {
        "Accept": "*/*",
      }
    });

    const contracts = getContractsFromReleases(result.data.releases);

    console.log('contracts', contracts);

    let results = await queryDB('CALL actualizar_registrar_obras(?)', [JSON.stringify(contracts.map(c => ({ ...c, date: moment.utc(c.date).format('YYYY-MM-DD HH:mm:ss') })))]);

    console.log('results', results);

    res.json({ affectedRows: results.affectedRows });
  } catch (error) {
    console.log('No se pudo actualizar las obras: ', error);
    res.status(500).json({ message: 'No se pudo actualizar las obras' });
  }
}

const getLatestWorks = async (req, res) => {
  try {
    let results = await queryDB('CALL obtener_obras()', []);
    res.json({ results: results[0] });
  } catch (error) {
    console.log('No se pudo obtener las últimas obras: ', error);
    res.status(500).json({ message: 'No se pudo obtener las últimas obras' });
  }
}

const getBestworks = async (req, res) => {
  try {
    let results = await queryDB('CALL obtener_mejores_obras()', []);
    res.json({ results: results[0] });
  } catch (error) {
    console.log('No se pudo obtener las mejores obras: ', error);
    res.status(500).json({ message: 'No se pudo obtener las mejores obras' });
  }
}

module.exports = {
  updateWorks,
  getLatestWorks,
  getBestworks
}