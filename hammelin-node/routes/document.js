const { Router } = require("express");
const { processDocument } = require("../controller/document");

const router = Router();

router.post("/", processDocument);

module.exports = router;