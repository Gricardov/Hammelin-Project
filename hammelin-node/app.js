const Server = require("./models/server");

// Configuración dotenv
require('custom-env').env();

const server = new Server();

server.listen();