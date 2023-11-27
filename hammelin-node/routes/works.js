const { Router } = require("express");
const { getLatestWorks, updateWorks, getBestworks } = require("../controller/works");

const router = Router();

router.get("/best", getBestworks);
router.get("/latest", getLatestWorks);
router.get("/update", updateWorks);

module.exports = router;