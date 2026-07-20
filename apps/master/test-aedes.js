const aedes = require('aedes');
console.log('aedes.Aedes keys:', aedes.Aedes ? Object.keys(aedes.Aedes) : 'undefined');
console.log('typeof aedes.Aedes.createBroker:', typeof aedes.Aedes.createBroker);
