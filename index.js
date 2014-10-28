// Import RTC libraries and plugins
var quickconnect = require('rtc-quickconnect');
var mesh = require('rtc-mesh');
var media = require('rtc-media');

// Import CRDT distributed data stuctures
var Doc = require('crdt').Doc;
var uuid = require('uuid');


// Initialise the connection
var qc = quickconnect('http://switchboard.rtc.io', {
  room: 'movie-mesh-crdt',
});

// Create the model
var model = mesh(qc, { model: new Doc() });

// Report data change events
model.on('row_update', updatePromotions);

// Capture local media
var localMedia = media();

// Give and recieve video from peers
localMedia.once('capture', function(stream) {
  // Render the local media
  var id = qc.id;
  peerMedia[id] = peerMedia[id] || [];
  peerMedia[id] = peerMedia[id].concat(renderMedia(localMedia, id));

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
function renderMedia(media, id) {
    var stream = document.createElement('div');
    stream.className = 'stream';
    streams.appendChild(stream);

    var video = document.createElement('div');
    video.className = 'video';
    stream.appendChild(video);

    var button = document.createElement('button');
    var icon = document.createElement('i');
    icon.className = 'fa fa-thumbs-o-up';
    button.onclick = promoteStream.bind(this, stream, id);
    button.appendChild(icon);
    stream.appendChild(button);

    var count = document.createElement('p');
    count.className = 'count';
    stream.appendChild(count);
    
    media.render(video);

    return stream;
}


// Add and render a remote video
var peerMedia = {};
function addStream(id) {
  // Create the peer media list
  peerMedia[id] = peerMedia[id] || [];

  return function(stream) {
    var remoteMedia = media(stream);
    peerMedia[id] = peerMedia[id].concat(renderMedia(remoteMedia, id));
    updatePromotions();
  }
}


// Stream Promotion
var user = uuid.v4();
model.add({id: user, promoted: undefined});

function promoteStream(stream, id) {
  // Unpromote other streams
  for (var s=0; s<streams.childNodes.length; s++) {
    streams.childNodes[s].className = 'stream';
  } 

  // Promote this stream
  stream.className = 'stream promoted';

  model.set(user, {promoted: id});
}

function updatePromotions() {
  // Count promotions
  var promotions = {};
  for (var r in model.rows) {
    var state = model.rows[r].state;
    promotions[state.promoted] = (promotions[state.promoted] || 0) + 1;
  };

  console.log("Promotion counts:", promotions, peerMedia);

  // Display promotions
  for (var p in peerMedia) {
    var streams = peerMedia[p];
    if (streams) {
      streams.forEach(function(stream) {
        var count = stream.getElementsByClassName('count');
        count[0].innerHTML = promotions[p] || '-';
      });
    }
  }
}
