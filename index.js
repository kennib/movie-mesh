// Import RTC libraries and plugins
var quickconnect = require('rtc-quickconnect');
var mesh = require('rtc-mesh');


// Initialise the connection
var qc = quickconnect('http://rtc.io/switchboard', {
  room: 'movie-mesh',
});

// Create the model
var model = mesh(qc);

// Report data change events
model.on('change', function(key, value) {
  console.log('captured change key: "' + key + '" set to ', value);
});

model.set('lastjoin', Date.now());
