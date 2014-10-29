// Import RTC libraries and plugins
var quickconnect = require('rtc-quickconnect');
var mesh = require('rtc-mesh');
var media = require('rtc-media');
var freeice = require('freeice');

// Import CRDT distributed data stuctures
var Doc = require('crdt').Doc;
var uuid = require('uuid');

// JQuery
$ = require('jquery');

// Initialise the connection
var qc = quickconnect('http://switchboard.rtc.io', {
  room: 'movie-mesh-crdt',
  iceServers: freeice(),
  expectedLocalStreams: 1,
});

// Create the model
var model = mesh(qc, { model: new Doc() });

// Report data change events
model.on('row_update', updatePromotions);

// Capture local media
var localMedia = media({
  video: {
    mandatory: {
      maxWidth: 320,
      maxHeight: 240,
    },
  },
  audio: true,
});

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
    console.log('peer disconnected: ', id);
    // Remove media for the target peer from the dom
    (peerMedia[id] || []).splice(0).forEach(function(stream) {
      stream.remove();
    });
  })
});


// Create the elements
var streams = $('<div>')
  .addClass('streams')
  .appendTo(document.body);

// Render a video
function renderMedia(media, id) {
    var stream = $('<div>')
      .addClass('stream')
      .appendTo(streams);

    var video = $('<div>')
      .addClass('video')
      .appendTo(stream);

    var button = $('<button>')
      .click(promoteStream.bind(this, stream, id))
      .appendTo(stream);
    var icon = $('<i>')
      .addClass('fa fa-thumbs-o-up')
      .appendTo(button);

    var count = $('<p>')
      .addClass('count')
      .appendTo(stream);
    
    media.render(video.get(0));
    stream.find('video').each(function(v, video) {
      $(video).attr('muted', '');
    });

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
  streams.find('.stream').removeClass('promoted');
  streams.find('video').each(function(v, video) {
    $(video).attr('muted', '');
  });

  // Promote this stream
  stream.addClass('promoted');
  stream.find('video').each(function(v, video) {
    $(video).attr('muted');
  });

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
        if (stream.attr('data-promotions') != (promotions[p] || -1))
          stream.attr('data-changed', '');
        else
          stream.removeAttr('data-changed');

        stream.attr('data-promotions', promotions[p] || -1)
        stream.find('.count')
          .text(promotions[p] || '-');
      });
    }
  }

  // Re order streams
  var streams = $('.streams');
  var streamElems = streams.children('.stream');
  streamElems.sort(function(a,b) {
    var an = a.getAttribute('data-promotions'),
        bn = b.getAttribute('data-promotions');

    if(an < bn) {
      return 1;
    }
    if(an > bn) {
      return -1;
    }
    return 0;
  });

  streamElems
    .detach()
    .each(function(s, stream) {
      if (stream.hasAttribute('data-changed'))
        $(stream).fadeIn();
    })
    .appendTo(streams);

  streamElems.find('video').each(function(v, video) {
    video.play();
  });
}
