const router = require('./routes/children');
console.log(router.stack.map((layer) => ({ path: layer.route?.path, methods: layer.route?.methods })));
