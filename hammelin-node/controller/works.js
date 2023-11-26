const { queryDB } = require('../database/pool');
const { getContractsFromReleases } = require('../utils/functions');
const { default: axios } = require('axios');
require('custom-env').env();

const updateWorks = async () => {
  // Obtengo las últimas obras
  const result = await axios.get(`https://contratacionesabiertas.osce.gob.pe/api/v1/releases?page=1&order=desc&sourceId=seace_v3&mainProcurementCategory=works`, {
    headers: {
      "Accept": "*/*",
    }
  });

  const contracts = getContractsFromReleases(result.data.releases);

  console.log('contracts', contracts);

  let results = await queryDB('CALL actualizar_registrar_obras(?)', [JSON.stringify(contracts.map(c => ({ ...c, date: moment(c.date).format('YYYY-MM-DD HH:mm:ss') })))]);

  console.log('results', results);

  res.json({
    ok: 'ok'
  });

}

/*const getLatestWorks = async (req, res) => {

}*/

module.exports = {
  updateWorks
  //getLatestWorks
}