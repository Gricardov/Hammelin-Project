const { Router } = require("express");
const { registerReport } = require("../controller/reports");

const router = Router();

router.post("/", registerReport);

module.exports = router;