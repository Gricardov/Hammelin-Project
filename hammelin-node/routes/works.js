const { Router } = require("express");
const { updateWorks } = require("../controller/works");

const router = Router();

//router.post("/latest", getLatestWorks);
router.get("/update", updateWorks);

module.exports = router;