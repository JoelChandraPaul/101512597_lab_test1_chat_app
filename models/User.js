const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    createdOn: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("User", UserSchema);
