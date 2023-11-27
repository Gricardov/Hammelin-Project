const { Router } = require("express");
const { registerReport } = require("../controller/reports");

const router = Router();

router.put("/register", registerReport);

module.exports = router;