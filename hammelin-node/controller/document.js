const { extractKeypointsFromText, getFileBuffer, getPdfDataFromUrl, getContractsFromReleases } = require('../utils/functions');
const { default: axios } = require('axios');
const OpenAI = require('openai');
require('custom-env').env();

const openai = new OpenAI();

const text = `
        a) FINALIDAD PÚBLICA
                Dotar de una adecuada infraestructura bajo las condiciones de seguridad, durabilidad, funcionalidad,
                estética, y economía, para mejorar la calidad educativa de los usuarios en el tiempo, considerando el
                "Protocolo Sanitario del Sector Vivienda, Construcción y Saneamiento para el inicio gradual e incremental
                de las actividades en la Reanudación de Actividades" contenido en la Resolución Ministerial N° 087-2020-
                VIVIENDA y los "Lineamientos para la Vigilancia, Prevención y Control de la salud de los trabajadores con
                riesgo de exposición a SARS-CoV-2" aprobados mediante Resolución Ministerial N° 1275- 2021-MINSA.
        b) INFORMACIÓN DEL PROYECTO
            Descripción:
                “Mejoramiento de los Servicios de Educación Primaria
                de la I.E. Nº 1245 José Carlos Mariátegui, con Código Único de Inversiones N° 2233960”
            CUI:
                2233960
        d) ENTREGA DEL TERRENO
            Entrega de terreno:
                SE HARA LA ENTREGA DEL TERRENO CORRESPONDIENTE A LA OBRA.
        e) ADELANTOS
            i. ADELANTO DIRECTO
                El contratista debe solicitar formalmente el Adelanto Directo dentro de los ocho (8) días siguientes a
                la suscripción del contrato, adjuntando a su solicitud la garantía por adelantos mediante CARTA
                FIANZA1: o PÓLIZA DE CAUCIÓN y el comprobante de pago correspondiente. La Entidad debe entregar
                el monto solicitado dentro de los siete (7) días contados a partir del día siguiente de recibida la
                solicitud del contratista. (Art. 181 Reglamento de la Ley de Contrataciones del Estado).
                Vencido el plazo para solicitar el adelanto no procede la solicitud.`;

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

    textsToAnalyze = pdfsData.map(pdf => pdf.text.slice(0, 45000).replace(/\n/g, " ").trim());

    console.log('textsToAnalyze', textsToAnalyze);

    // Solo es válido si es que hay, al menos, un elemento en el array no vacío
    const isValid = textsToAnalyze.filter(t => t.trim()).length > 0;

    if (!isValid) {
      return res.json({ keypoints: {} });
    }

    const questionsToMake = [
      {
        delimiterTag: 'hia-sob',
        name: 'sobre',
        question: '¿De qué trata la obra?'
      },
      {
        delimiterTag: 'hia-ub',
        name: 'ubicacion',
        question: '¿Cuál es la ubicación de la obra?'
      },
      {
        delimiterTag: 'hia-fin',
        name: 'finalidad',
        question: '¿Cuál es la finalidad de la obra?'
      },
      {
        delimiterTag: 'hia-cui',
        name: 'CUI',
        question: '¿Cuál es el CUI de la obra?'
      },
      {
        delimiterTag: 'hia-ade',
        name: 'ADE',
        question: '¿Qué debe adjuntar el contratista a su solicitud?'
      },
      {
        delimiterTag: 'hia-pro',
        name: 'provincia',
        question: '¿En qué provincia será la obra?'
      },
      {
        delimiterTag: 'hia-dis',
        name: 'distrito',
        question: '¿En qué distrito será la obra?'
      },
      {
        delimiterTag: 'hia-reg',
        name: 'region',
        question: '¿En qué región será la obra?'
      }
    ];

    console.log(`Consultando a la IA...`);
    const completion = await openai.chat.completions.create({
      temperature: 0,
      messages: [{ "role": "system", "content": "Eres un gran analizador de textos" },
      {
        "role": "user",
        "content": `${textsToAnalyze.join('\n\n')}       

    En base al texto, respóndeme las siguientes preguntas en un lenguaje amigable. Pon tu respuesta dentro de los tags indicados:

    ${questionsToMake.map(q => `
    ${q.question}
    <${q.delimiterTag}>Tu respuesta aquí</${q.delimiterTag}>\n`)}
    `}
      ],
      model: 'ft:gpt-3.5-turbo-1106:personal::8PLF3bkn',
      //max_tokens: 16384
      //model: 'gpt-3.5-turbo-16k',
      //model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    console.log('response', response);
    const keypoints = extractKeypointsFromText(response, questionsToMake);
    console.log('keypoints', keypoints);
    res.json({ keypoints });
  } catch (error) {
    console.log('No se pudo procesar el documento: ', error);
    res.status(500).json({ message: 'No se pudo procesar el documento' });
  }
}

module.exports = {
  processDocument
}