const { createServerlessHandler } = require("../../lib/app-handler");

const handler = createServerlessHandler("send-otp");

module.exports = handler;
module.exports.default = handler;
