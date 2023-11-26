const QRCode = require('qrcode');
const stream = require('stream');
const moment = require('moment');
const FileType = require('file-type');
const PdfStringfy = require('pdf-stringfy');
const { default: axios } = require('axios');
require("moment/locale/es");
require('custom-env').env();

/*const { Storage } = require('@google-cloud/storage');

const storage = new Storage({ keyFilename: "./firebase-admin-key.json" });

const configureBucketCors = async () => {
    await storage.bucket('gs://temple-luna.appspot.com').setCorsConfiguration([
        {
            maxAgeSeconds: 3600,
            method: ['GET'],
            origin: ['*'],
            responseHeader: ['*'],
        },
    ]);
}

configureBucketCors();*/

const extractBussinessDataFromInstagram = (profileData, maxNumberOfPosts) => {
    return {
        description: profileData.biography || '',
        name: profileData.full_name || '',
        categoryId: profileData.business_category_name || '',
        categoryName: profileData.category_name || '',
        username: profileData.username || '',
        posts: profileData.edge_owner_to_timeline_media.edges
            .slice(0, maxNumberOfPosts)
            .map(edge => ({
                type: edge.node.__typename,
                previewUrl: edge.node.display_url,
                description: edge.node.edge_media_to_caption?.edges?.[0]?.node?.text || ''
            }))
    }
}

const isNullOrUndefined = (value) => value == null || value == undefined;

const toSentence = (text, limit) => {
    limit = !limit ? text.length : limit;
    if (text && text.length > 0) {
        return (text.substring(0, 1).toUpperCase() + text.substring(1, limit).toLowerCase()).trim();
    } else {
        return '';
    }
}

// Esto agrega una letra mayúscula al inicio de todas las palabras del texto
const eachWordtoSentence = (text) => {
    const words = text.split(' ');
    const wordsArray = words.map(word => toSentence(word));
    return wordsArray.join(' ');
}

const getIAResponse = async (message) => {
    const response = await axios.get('https://api.wit.ai/message', {
        params: {
            v: 20230422,
            q: message
        },
        headers: {
            Authorization: `Bearer ${process.env.WITT_SERVER_TOKEN}`
        }
    });
    return response.data;
}

const getBestIntent = (intents) => {
    let currentConfidence = 0;
    let bestIntent;
    intents.forEach(intent => {
        if (intent.confidence > currentConfidence) {
            currentConfidence = intent.confidence;
            bestIntent = intent;
        }
    });
    return bestIntent;
}

const streamToBuffer = stream => {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    })
};

const generateQRFile = async (content, width = 200, errorCorrectionLevel = 'L') => {
    const qrStream = new stream.PassThrough();
    await QRCode.toFileStream(qrStream, content,
        {
            type: 'png',
            width,
            margin: 1,
            color: {
                dark: "#000",
                light: "#FFF"
            },
            errorCorrectionLevel
        }
    );
    return await streamToBuffer(qrStream);
}

const breakWordIntoArray = (word, font, fontSize, maxWidth) => {
    let brokenWordArr = [];
    const charArray = word.split(""); // Ejm: [a,b,c,d,e,f,g]
    while (charArray.length > 0) {
        // Si la cadena de caracteres sobrepasa el máximo, ve probando hasta que entre
        if (font.widthOfTextAtSize(charArray.join(""), fontSize) > maxWidth) {
            // Ve probando de mayor a menor longitud
            for (let i = charArray.length - 1; i >= 0; i--) {
                // Pruebo con esta longitud
                const tempCharArray = charArray.slice(0, i + 1);
                // Si con esta longitud se pasa, continuo probando en la siguiente iteración.
                // Caso contrario, hago splice al original y detengo la prueba actual
                if (font.widthOfTextAtSize(tempCharArray.join(""), fontSize) <= maxWidth) {
                    // Elimino la porción del original
                    const splicedPortion = charArray.splice(0, i + 1);
                    // Agrego lo que eliminé
                    brokenWordArr.push(splicedPortion.join(""));
                    // Detengo la prueba
                    break;
                }
            }
        } else {
            // Si no sobrepasa, que lo agregue
            brokenWordArr.push(charArray.join(""));
            // Limpio el arreglo para que termine el while
            charArray.splice(0, charArray.length);
        }
    }
    return brokenWordArr;
}

const getLinesOfText = (text, font, fontSize, maxWidth) => {
    let linesOfText = [];
    var paragraphs = text.split('\n');
    //console.log('par',paragraphs);
    for (let index = 0; index < paragraphs.length; index++) {
        var paragraph = paragraphs[index];
        // Si la línea de texto sobrepasa el tamaño indicado, secciona por palabras
        if (font.widthOfTextAtSize(paragraph, fontSize) > maxWidth) {
            // Primero, obtengo las palabras con separación
            var rawWords = paragraph.split(' ');

            let words = [];

            rawWords.map(rawWord => {
                // Si la palabra sobrepasa el ancho máximo, la corto en pedacitos
                if (font.widthOfTextAtSize(rawWord, fontSize) > maxWidth) {
                    words = words.concat(breakWordIntoArray(rawWord, font, fontSize, maxWidth))
                } else {
                    words.push(rawWord);
                }
            });

            var newParagraph = [];
            var i = 0;
            newParagraph[i] = [];

            for (let k = 0; k < words.length; k++) {

                var word = words[k];
                newParagraph[i].push(word);

                // Si esta línea reformulada sobrepasa el tamaño, elimina la última palabra y pásala a la siguiente línea
                if (font.widthOfTextAtSize(newParagraph[i].join(' '), fontSize) > maxWidth) {
                    // Elimina la última palabra
                    newParagraph[i].splice(-1);
                    // Muevete a la siguiente línea
                    i = i + 1;
                    // Limpiala
                    newParagraph[i] = [];
                    // Y agrégala ahí
                    newParagraph[i].push(word);
                }
            }
            paragraphs[index] = newParagraph.map(p => p.join(' '))//.join('\n');
            linesOfText = linesOfText.concat(paragraphs[index]);
        } else {
            linesOfText.push(paragraph);
        }
    }
    return linesOfText;//paragraphs.join('\n');
}

const getDateText = (date) => {
    const momentObj = moment(date);
    return toSentence(momentObj.format('D [de] MMMM [del] YYYY'));
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomWhatsappAssistantName = () => {
    const whatsappAssistants = ['Milagros', 'Brenda', 'Loedrin', 'Isabel', 'Yocasta'];
    const randomIndex = getRandomInt(0, whatsappAssistants.length - 1);
    return whatsappAssistants[randomIndex];
}

// Esta función recibe un número con símbolos y espacios, y lo transforma a puros numeritos que Whatsapp puede entender
const cleanPhoneForWhatsapp = (rawPhone) => {
    return rawPhone.replace(/\s+/g, '').replace(/\+/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\-/g, '');
}

const extractKeypointsFromText = (rawText, keypointsArray) => {

    const objectResponse = {};

    keypointsArray.forEach((kp) => {
        let extractedText = '';
        const textMatch = rawText.match(new RegExp(`<${kp.delimiterTag}>(.*?)<\\/${kp.delimiterTag}>`, 'gs'));
        if (textMatch) {
            extractedText = textMatch[0].replace(new RegExp(`<\\/?${kp.delimiterTag}>`, 'g'), '');
        }
        objectResponse[kp.name] = extractedText;
    });

    return objectResponse;
}

const getFileBuffer = async (url) => {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer' // Set the response type to arraybuffer
        });

        // Store the file content in a buffer
        const pdfBuffer = Buffer.from(response.data, 'binary');

        return pdfBuffer;
    } catch (error) {
        console.error('Error fetching file:', error);
        throw error;
    }
}

const getPdfDataFromBuffer = async (buffer) => {
    return new Promise((resolve, reject) => {
        try {
            PdfStringfy(buffer).then(function (data) {
                resolve(data);
            });
        } catch (error) {
            reject(error);
        }
    });
}

const getPdfDataFromUrl = async (docUrl) => {
    const buffer = await getFileBuffer(docUrl);
    const pdfData = await getPdfDataFromBuffer(buffer);
    return pdfData;
}

const getContractsFromReleases = (releases) => {
    return releases.map(r => ({
        id: r.id,
        ocid: r.ocid,
        date: r.date,
        buyer: r.buyer.name,
        tender: {
            id: r.tender.id,
            name: r.tender.description,
            value: r.tender.value.amount,
            currency: r.tender.value.currency
        },
        documents: r.tender.documents
    }));
}

module.exports = {
    isNullOrUndefined,
    toSentence,
    eachWordtoSentence,
    generateQRFile,
    getLinesOfText,
    getDateText,
    //uploadResultRequest,
    getRandomWhatsappAssistantName,
    cleanPhoneForWhatsapp,
    getIAResponse,
    getBestIntent,
    extractBussinessDataFromInstagram,
    extractKeypointsFromText,
    getPdfDataFromUrl,
    getContractsFromReleases
}
