const { createServerlessHandler } = require("../../lib/app-handler");

const handler = createServerlessHandler("products", "/api/admin");

module.exports = handler;
module.exports.default = handler;
