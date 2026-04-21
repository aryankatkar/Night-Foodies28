const { createServerlessHandler } = require("../../lib/app-handler");

const handler = createServerlessHandler("login");

module.exports = handler;
module.exports.default = handler;
