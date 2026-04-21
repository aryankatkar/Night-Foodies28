const { createServerlessHandler } = require("../../lib/app-handler");

const handler = createServerlessHandler("login", "/api/admin");

module.exports = handler;
module.exports.default = handler;
