const express = require('express');
const cors = require('cors');
const { processDocumentRoutes, worksRoutes, reportsRoutes } = require("../routes");
const { testConnectionDB } = require('../database/pool');
require('custom-env').env();

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.HOST_PORT;
        this.apiPaths = {
            processDocument: '/api/process-document',
            works: '/api/works/',
            reports: '/api/reports/'
        };

        // Conexión a la bd
        this.connectDB();

        // Servidor Whatsapp
        this.whatsapp();

        // Middlewares
        this.middlewares();

        // Rutas
        this.routes();
    }

    whatsapp() {
        //wspServer.listen();
    }

    async connectDB() {
        try {
            await testConnectionDB();
            console.log('Conectado a bd!');
        } catch (error) {
            console.log(error);
        }
    }

    middlewares() {
        //CORS
        this.app.use(cors());

        // Lectura y parseo del body
        this.app.use(express.json());

        // Rutas
        this.app.use(express.static('public'));
    }

    routes() {
        this.app.use(this.apiPaths.processDocument, processDocumentRoutes);
        this.app.use(this.apiPaths.works, worksRoutes);
        this.app.use(this.apiPaths.reports, reportsRoutes);
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log('Listening on ' + this.port);
        })
    }
}

module.exports = Server;