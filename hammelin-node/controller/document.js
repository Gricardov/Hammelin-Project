const { extractKeypointsFromText, getPdfDataFromUrl, getContractsFromReleases, getTextFromPdfBufferOcr } = require('../utils/functions');
const { default: axios } = require('axios');
const OpenAI = require('openai');
require('custom-env').env();

const openai = new OpenAI();

const processDocument = async (req, res) => {
  try {
    const id = req.query.id;
    let result;

    if (id) {
      // Obtengo la obra por id
      result = await axios.get(`https://contratacionesabiertas.osce.gob.pe/api/v1/release/${id}`, {
        headers: {
          "Accept": "*/*",
        }
      });
    } else {
      // Obtengo las últimas obras
      result = await axios.get(`https://contratacionesabiertas.osce.gob.pe/api/v1/releases?page=1&order=desc&sourceId=seace_v3&mainProcurementCategory=works`, {
        headers: {
          "Accept": "*/*",
        }
      });
    }

    const contracts = getContractsFromReleases(result.data.releases);

    const contractToUse = contracts[0]; // Solo agarro el último contrato
    console.log('contractToUse', contractToUse);
    const docsToDownload = contractToUse.documents.filter(d => d.format === 'pdf').slice(0, 2); // Voy a descargar dos documentos como máximo

    let textsToAnalyze = [];

    // Descargo los documentos
    console.log(`Descargando ${docsToDownload.length} documentos...`);
    const urlsToDownload = docsToDownload.map(d => d.url);

    console.log('urlsToDownload', urlsToDownload);
    const pdfsData = await Promise.all(urlsToDownload.map(url => getPdfDataFromUrl(url)));

    textsToAnalyze = pdfsData.map(({ pdfData }) => pdfData.text.slice(0, 50000).replace(/\n/g, " ").trim());

    console.log('textsToAnalyze', textsToAnalyze);

    // Solo es válido si es que hay, al menos, un elemento en el array no vacío
    const isValid = textsToAnalyze.filter(t => t.trim()).length > 0;

    if (!isValid) {
      console.log('Leyendo OCR...');
      getTextFromPdfBufferOcr(pdfsData.map(({ buffer }) => buffer));

      return res.json({ keypoints: {} });
    }

    const questionsToMake = [
      {
        delimiterTag: 'hia-fin',
        name: 'finalidad',
        question: '¿Cuál es la finalidad de la obra?'
      },
      {
        delimiterTag: 'hia-ubi',
        name: 'ubicacion',
        question: '¿Cuál es la ubicación de la obra?'
      },
      {
        delimiterTag: 'hia-pre',
        name: 'presupuesto',
        question: '¿Cuál es el presupuesto de la obra?'
      },
      {
        delimiterTag: 'hia-pla',
        name: 'plazo',
        question: '¿En qué plazo debería estar ejecutada la obra?'
      },
      {
        delimiterTag: 'hia-ter',
        name: 'terminado',
        question: '¿Qué debería tener esta obra cuando esté terminada? Detállame'
      }
    ];

    console.log(`Consultando a la IA...`);
    const completion = await openai.chat.completions.create({
      temperature: 0,
      messages: [{ "role": "system", "content": "Eres un gran analizador de textos" },
      {
        "role": "user",
        "content": `${textsToAnalyze.join('\n\n')}       

    En base al texto, responde las siguientes preguntas dentro de los tags:

    ${questionsToMake.map(q => `
    ${q.question}
    <${q.delimiterTag}>Aquí pon tu respuesta</${q.delimiterTag}>\n`)}
    `}
      ],
      model: 'gpt-3.5-turbo-1106',
      //model: 'ft:gpt-3.5-turbo-1106:personal::8PLF3bkn',
      //max_tokens: 16384
      //model: 'gpt-3.5-turbo-16k',
      //model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    console.log('response', response);
    const keypoints = extractKeypointsFromText(response, questionsToMake);
    console.log('keypoints', keypoints);
    res.json({ keypoints, textsToAnalyze });
  } catch (error) {
    console.log('No se pudo procesar el documento: ', error);
    res.status(500).json({ message: 'No se pudo procesar el documento' });
  }
}

module.exports = {
  processDocument
}