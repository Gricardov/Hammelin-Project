const { extractKeypointsFromText, getPdfDataFromUrl, getContractsFromReleases } = require('../utils/functions');
const { default: axios } = require('axios');
const OpenAI = require('openai');
require('custom-env').env();

const openai = new OpenAI();

const makeQuestion = async (req, res) => {
  try {
    const { question, textsToAnalyze } = req.body;

    console.log(`Consultando a la IA...`);
    const completion = await openai.chat.completions.create({
      temperature: 0,
      messages: [{ "role": "system", "content": "Eres un gran analizador de textos" },
      {
        "role": "user",
        "content": `${textsToAnalyze.join('\n\n')}       

      En base al texto, responde la siguiente pregunta: ${question}`
      }],
      model: 'gpt-3.5-turbo-1106'
    });

    const response = completion.choices[0].message.content;
    console.log('response', response);
    res.json({ answer: response });
  } catch (error) {
    console.log('No se pudo procesar el documento: ', error);
    res.status(500).json({ message: 'No se pudo procesar el documento' });
  }
}

module.exports = {
  makeQuestion
}