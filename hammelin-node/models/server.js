const express = require('express');
const cors = require('cors');
const { processDocumentRoutes, worksRoutes, reportsRoutes,questionsRoutes } = require("../routes");
const { testConnectionDB } = require('../database/pool');
require('custom-env').env();

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.HOST_PORT;
        this.apiPaths = {
            processDocument: '/api/process-document',
            works: '/api/works',
            reports: '/api/reports',
            questions: '/api/questions'
        };

        // Middlewares
        this.middlewares();

        // Conexión a la bd
        this.connectDB();

        // Rutas
        this.routes();
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

        // Inside your routes setup, before defining routes
        this.app.use((req, res, next) => {
            console.log(`Received ${req.method} request to ${req.originalUrl}`);
            next();
        });

        // Lectura y parseo del body
        this.app.use(express.json());

        // Rutas
        this.app.use(express.static('public'));
    }

    routes() {
        this.app.use(this.apiPaths.processDocument, processDocumentRoutes);
        this.app.use(this.apiPaths.works, worksRoutes);
        this.app.use(this.apiPaths.reports, reportsRoutes);
        this.app.use(this.apiPaths.questions, questionsRoutes);
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log('Listening on ' + this.port);
        })
    }
}

module.exports = Server;