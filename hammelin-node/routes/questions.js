const { Router } = require("express");
const { makeQuestion } = require("../controller/questions");

const router = Router();

router.post("/", makeQuestion);

module.exports = router;