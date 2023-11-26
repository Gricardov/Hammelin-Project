const fs = require('fs');
const nodemailer = require('nodemailer');
const http = require('http');
const moment = require('moment');
const { getRandomWhatsappAssistantName, toSentence, cleanPhoneForWhatsapp } = require('../utils/functions');

require('custom-env').env();

// Contiene el transportador para los emails
const transporter = nodemailer.createTransport({
    //service: 'gmail',
    host: 'smtp.zoho.com',
    port: 465,
    pool: true,
    maxConnections: 20,
    secure: true,
    auth: {
        user: process.env.TEMP_Z_USER,
        pass: process.env.TEMP_Z_KEY
    }
});

const getTemplate = async (fileName) => {
    return new Promise((resolve, reject) => {
        fs.readFile(__dirname + '/../templates/' + fileName, async (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}

const sendMail = async (mail) => {
    return new Promise((resolve, reject) => {
        transporter.sendMail(mail, function (error, info) {
            if (error) {
                reject(error);
            } else {
                console.log('Correo enviado: ' + info.response);
                resolve(info);
            }
        });

    })
}

const sendWhatsapp = async (number, message) => {
    return new Promise((resolve, reject) => {
        const data = new TextEncoder().encode(
            JSON.stringify({ number, message })
        );

        const options = {
            hostname: 'localhost',
            port: 8082,
            path: '/whatsapp/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, res => {
            console.log(`statusCode: ${res.statusCode}`);
            res.on('data', d => {
                process.stdout.write(d);
            });
            resolve(res);
        });

        req.on('error', error => {
            console.error(error);
            reject(error);
        });

        req.write(data);
        req.end();
    })
}