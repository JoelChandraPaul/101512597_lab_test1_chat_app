const express = require("express");
const PrivateMessage = require("../models/PrivateMessage");

const router = express.Router();

router.get("/private", async (req, res) => {
  const { user, withUser } = req.query;

  if (!user || !withUser) {
    return res.status(400).json({ ok: false, message: "user and withUser are required." });
  }

  const messages = await PrivateMessage.find({
    $or: [
      { from_user: user, to_user: withUser },
      { from_user: withUser, to_user: user }
    ]
  })
    .sort({ date_sent: 1 })
    .limit(50)
    .lean();

  res.json({ ok: true, messages });
});

module.exports = router;
