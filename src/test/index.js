var context = require.context('./suite', true, /.ts$/);
context.keys().forEach(context);
module.exports = context;