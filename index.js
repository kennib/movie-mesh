// Import RTC libraries and plugins
var quickconnect = require('rtc-quickconnect');
var mesh = require('rtc-mesh');
var media = require('rtc-media');


// Initialise the connection
var qc = quickconnect('http://switchboard.rtc.io', {
  room: 'movie-mesh-crdt',
});

// Capture local media
var localMedia = media();

// Give and recieve video from peers
localMedia.once('capture', function(stream) {
  // Share video
  qc.addStream(stream);
  
  // Recieve video
  qc.on('call:started', function(id, pc, data) {
    console.log('peer connected: ', id);

    // Render the remote streams
    pc.getRemoteStreams().forEach(addStream(id));
  })
  // when a peer leaves, remove the media
  .on('call:ended', function(id) {
    // Remove media for the target peer from the dom
    (peerMedia[id] || []).splice(0).forEach(function(el) {
      el.parentNode.removeChild(el);
    });
  })
});


// Create the elements
var streams = document.createElement('div');
streams.className = 'streams';
document.body.appendChild(streams);

// Render a video
function renderMedia(media) {
    var stream = document.createElement('div');
    stream.className = 'stream';
    streams.appendChild(stream);

    var button = document.createElement('button');
    var icon = document.createElement('i');
    icon.className = 'fa fa-thumbs-o-up';
    button.appendChild(icon);
    stream.appendChild(button);
    
    media.render(stream);

    return stream;
}


// Add and render a remote video
var peerMedia = {};
function addStream(id) {
  // Create the peer media list
  peerMedia[id] = peerMedia[id] || [];

  return function(stream) {
    var remoteMedia = media(stream);
    peerMedia[id] = peerMedia[id].concat(renderMedia(remoteMedia));
  }
}

// Render the local media
renderMedia(localMedia);

