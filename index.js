var path = require("path");
var sModuleName = path.basename(__dirname);
module.exports = require("./" + sModuleName);