const { Router } = require("express");
const { registerReport } = require("../controller/reports");

const router = Router();

router.put("/", registerReport);

module.exports = router;