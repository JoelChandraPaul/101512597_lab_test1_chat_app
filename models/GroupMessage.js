const mongoose = require("mongoose");

const GroupMessageSchema = new mongoose.Schema(
  {
    from_user: { type: String, required: true, trim: true },
    room: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    date_sent: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("GroupMessage", GroupMessageSchema);
