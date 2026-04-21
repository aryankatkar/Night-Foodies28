const { createServerlessHandler } = require("../../lib/app-handler");

const handler = createServerlessHandler("verify-otp");

module.exports = handler;
module.exports.default = handler;
