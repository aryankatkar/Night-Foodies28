const { createServerlessHandler } = require("../../lib/app-handler");

const handler = createServerlessHandler("signup");

module.exports = handler;
module.exports.default = handler;
