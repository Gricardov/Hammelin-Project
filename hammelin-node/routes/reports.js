const { Router } = require("express");
const { registerReport } = require("../controller/reports");

const router = Router();

router.post("/register", registerReport);

module.exports = router;