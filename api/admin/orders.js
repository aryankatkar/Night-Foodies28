const { createServerlessHandler } = require("../../lib/app-handler");

const handler = createServerlessHandler("orders", "/api/admin");

module.exports = handler;
module.exports.default = handler;
