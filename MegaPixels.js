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
        console.log({
            updatePeriod: this.params.pixelpusher.updatePeriod,
            deltaSequence: this.params.pixelpusher.deltaSequence,
            powerTotal: this.params.pixelpusher.powerTotal
        });
    }).on('timeout', function() {
        // be sure to handel the situation when the controller dissappears.
        // this could be due to power cycle or network conditions
        console.log('TIMEOUT : PixelPusher at address [' + controller.params.ipAddress + '] with MAC (' + controller.params.macAddress + ') has timed out. Awaiting re-discovery....');
        if (!!timer) clearInterval(timer);
    });

    // acquire the number of strips that the controller has said it
    // has connected via the pixel.rc config file

    var NUM_STRIPS = controller.params.pixelpusher.numberStrips;
    var STRIPS_PER_PACKET = controller.params.pixelpusher.stripsPerPkt;
    var NUM_PACKETS_PER_UPDATE = NUM_STRIPS / STRIPS_PER_PACKET;

    // aquire the number of pixels we that the controller reports is
    // in each strip. This is set in the pixel.rc file placed on your thumb drive.

    var PIXELS_PER_STRIP = controller.params.pixelpusher.pixelsPerStrip;

    // create a loop that will send commands to the PP to update the strip

    var UPDATE_FREQUENCY_MILLIS = 30; // 15 is just faster than 60 FPS

    // Calculate total number of pixels

    var NUM_PIXELS = NUM_STRIPS * PIXELS_PER_STRIP;
    var RAINBOW_MULTIPLIER = 2;

    // Generate rainbow (see http://krazydad.com/tutorials/makecolors.php)

    function makeColorGradient(frequency1, frequency2, frequency3,
                             phase1, phase2, phase3,rounding_on,
                             center, width, len )
    {
        if (center == undefined)   center = 128;
        if (width == undefined)    width = 127;
        if (len == undefined)      len = NUM_PIXELS * RAINBOW_MULTIPLIER;
        var rainbow = [];
        for (var i = 0; i < len; ++i)
        {
            var red = Math.sin(frequency1*i + phase1) * width + center;
            var grn = Math.sin(frequency2*i + phase2) * width + center;
            var blu = Math.sin(frequency3*i + phase3) * width + center;
            if (rounding_on ) {
                rainbow.push([Math.round(red), Math.round(grn), Math.round(blu)]);
            } else {
              rainbow.push([red, grn, blu]);
            }

        }
        return(rainbow);
    }
    var color_seed =0;
    var full_rainbow = makeColorGradient(0.3, 0.3, 0.3, 0,2,4, true);
    // console.log(full_rainbow);

    timer = setInterval(function() {
        // console.log('Color Seed',color_seed);
        // create an array to hold the data for all the strips at once
        // loop
        var position = 0;
        var color_index = 0;
        var strips = [];

        for (var stripId = position; stripId < NUM_STRIPS; stripId++) {
            var s = new PixelStrip(stripId, PIXELS_PER_STRIP);
            for ( var i = 0; i < PIXELS_PER_STRIP; i++) {
                position = stripId * PIXELS_PER_STRIP + i ;
                color_index = color_seed  + position;
                if ( color_index  > full_rainbow.length - 1) {
                    color_index = color_index - full_rainbow.length;
                }
                 var p = s.getPixel(i);
                var  rainbow_pixel = full_rainbow[color_index];
                p.setColor(rainbow_pixel[0], rainbow_pixel[1], rainbow_pixel[2]);
                //console.log("Color Seed, Position, Color Index", color_seed, position, color_index);
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
        if (color_seed > full_rainbow.length - 1) {
            color_seed = 0;
            //full_rainbow = makeColorGradient(0.3, 0.3, 0.3, 0,2,4, true);
        }

    }, UPDATE_FREQUENCY_MILLIS);

}).on('error', function(err) {
    console.log('PixelPusher Error: ' + err.message);
});