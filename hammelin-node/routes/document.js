const { Router } = require("express");
const { processDocument } = require("../controller/document");

const router = Router();

router.get("/", processDocument);

module.exports = router;