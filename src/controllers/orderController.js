const express = require("express");
const orderService = require("../services/orderService");
const authenticateToken = require("../middlewares/authorization");

const router = express.Router();

router.get("/status/:STATUS", async (req, res) => {
  const result = await orderService.getOrdersAccordingToStatus(
    req.params.STATUS
  );
  res.status(200);
  res.send(result);
});

router.post("/add", authenticateToken, async (req, res) => {
  const result = await orderService.addOrder(req.body);
  res.status(200);
  res.send(result);
});

module.exports = router;
