var PixelPusher = require('./pixelpusher');
var PixelStrip = PixelPusher.PixelStrip;
var LastPixel = 0;

new PixelPusher().on('discover', function(controller) {
  var timer = null;

  // log connection data on initial discovery
  console.log('-----------------------------------');
  console.log('Discovered PixelPusher on network: ');
  console.log(controller.params.pixelpusher);
  console.log('-----------------------------------');

  // capture the update message sent back from the pp controller
  controller.on('update', function() {
     /*
 console.log({
          updatePeriod: this.params.pixelpusher.updatePeriod,
          deltaSequence: this.params.pixelpusher.deltaSequence,
          powerTotal: this.params.pixelpusher.powerTotal
      });
*/
  }).on('timeout', function() {
      // be sure to handle the situation when the controller dissappears.
      // this could be due to power cycle or network conditions
      console.log('TIMEOUT : PixelPusher at address [' + controller.params.ipAddress + '] with MAC (' + controller.params.macAddress + ') has timed out. Awaiting re-discovery....');
      if (!!timer) clearInterval(timer);
});

// number of strips that the controller has said it
// has connected via the pixel.rc config file
var NUM_STRIPS = controller.params.pixelpusher.numberStrips;
var STRIPS_PER_PACKET = controller.params.pixelpusher.stripsPerPkt;
var NUM_PACKETS_PER_UPDATE = NUM_STRIPS / STRIPS_PER_PACKET;
var PIXELS_PER_STRIP = controller.params.pixelpusher.pixelsPerStrip;

// create a loop that will send commands to the PP to update the strip
var UPDATE_FREQUENCY_MILLIS = 480; // 15 is just faster than 60 FPS

// Calculate total number of pixels
NUM_PIXELS = NUM_STRIPS * PIXELS_PER_STRIP;
//console.log("# of Pixels: ", NUM_PIXELS);

//This is the degrees of Hue between colors
var HUE_DEGREES = 30 // 45;

// http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
**/

function rgbToHsv(r, g, b){
    r = r/255, g = g/255, b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    } else {
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, v];
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
**/

function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function makeHsvGradient() {
  var rainbow = [];

  var s = [1.0]; //[1, 0.75, 0.5, 0.25, 0,  0.25, 0.5 ,0.75, 1.0]

  for (var h = 0; h < 360; h = h + HUE_DEGREES) {
      for (var i = 0; i < s.length ; i = i + 1 ) {
        if (h % 120 == 0) {
          for (var j = 0; j < NUM_PIXELS/2; j = j + 1 ) {
            rainbow.push(hsvToRgb(h/360, s[i], 1.0));
          }
        }
        else {
          rainbow.push(hsvToRgb(h/360, s[i], 1.0));
        }
      }
  }
  //console.log("Rainbow", rainbow);
  //rainbow.reverse();
  return(rainbow);
}

var color_seed = 0;
var full_rainbow = makeHsvGradient();
//console.log(full_rainbow);
// Order testing
/*
full_rainbow = [
[255,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,255],
[255,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,255]
];
full_rainbow = [
[255,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,255,0],
[0,0,255],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,0,0],
[0,255,0],
[255,0,0],
[0,0,0],
[0,0,0]
];
*/
console.log("Gradient Size", full_rainbow.length);

timer = setInterval(function() {
  // console.log('Color Seed',color_seed);
  // create an array to hold the data for all the strips at once
  // loop
  var position = 0;
  var color_index = 0;
  var strips = [];

 for (var stripId = 0; stripId < NUM_STRIPS; stripId++) {
    var s = new PixelStrip(stripId, PIXELS_PER_STRIP);
    for ( var i = 0; i < PIXELS_PER_STRIP; i++) {
	    if (stripId == 0) {
      position = (PIXELS_PER_STRIP -  i )  - 1;
		}
		else {
      position = stripId * PIXELS_PER_STRIP + i  ;
		}
      color_index = color_seed + position;
      if ( color_index  > full_rainbow.length - 1) {
        color_index =  color_index - full_rainbow.length ;
      }
      var p = s.getPixel(i);
      var rainbow_pixel = full_rainbow[color_index];
      //console.log("Pixel ", stripId,i, rainbow_pixel, " Seed " + color_seed, " | Pos ", + position, " | Index " + color_index);
      p.setColor(rainbow_pixel[0], rainbow_pixel[1], rainbow_pixel[2]);
    }

    // render the strip data into the correct format for sending
    // to the pixel pusher controller
    var renderedStripData = s.getStripData();

    // add this data to our list of strip data to send
    strips.push(renderedStripData);
    
  }
  // inform the controller of the new strip frame
  controller.refresh(strips);

  // move position
  color_seed +=1 ;
  if (color_seed > full_rainbow.length - 2) {
    color_seed = 0;
  }

}, UPDATE_FREQUENCY_MILLIS);

}).on('error', function(err) {
    //console.log('PixelPusher Error: ' + err.message);
});
