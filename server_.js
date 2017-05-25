require('events').EventEmitter.prototype._maxListeners = 0;

var gpio = require('onoff').Gpio,
    motion = new gpio(14, 'in', 'both'),
    five = require("johnny-five"),
    pixel = require("../lib/pixel.js"),
    opts = {},
    board = new five.Board(opts),
    strip = null,
    showColor,
    cwi = 0,
    fps = 20,
    r, g, b; // colour wheel index (current position on colour wheel)


process.env.NODE_URL = 'leonwPi.local';

require('mahrio').runServer(process.env, __dirname).then(function(server) {

    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: ['../public/']
            }
        }
    });

    var io = require('socket.io').listen(server.listener);
    io.on('connection', function(socket) {
        console.log('connection: ', socket.id);
        socket.emit('event:hello');

        //BEGIN LISTENING FOR SOCKET MESSAGES FROM CLIENTS
        //Example:
        //socket.on('myCustomMessage', function( val ){ console.log( val ); });
        motion.watch(function(err, val) {
            if (err) {
                console.log('Motion in 14 Error');
                return;
                strip.off();
            }

            console.log('Motion in 14 is ' + (val ? 'ACTIVE' : 'INACTIVE') + ' : ' + new Date().toLocaleString());
            if (io) {
                io.sockets.emit('event:motion', val);
                //Neopixel
                opts.port = process.argv[2] || "";

                /**
                 * how many frames per second do you want to try?
                 */

                board.on("ready", function() {

                    console.log("Board ready, lets add light");

                    // setup the node-pixel strip.
                    strip = new pixel.Strip({
                        data: 6,
                        length: 12, // number of pixels in the strip.
                        board: this,
                        controller: "FIRMATA"
                    });

                    strip.on("ready", function() {
                        console.log("Strip ready, let's go");
                        dynamicRainbow(fps);
                    });

                    function dynamicRainbow(delay) {
                        console.log('dynamicRainbow');
                        var foo = setInterval(function() {
                            if (++cwi > 255) {
                                cwi = 0;
                            }

                            for (var i = 0; i < strip.length; i++) {
                                showColor = colorWheel((cwi + i) & 255);
                                strip.pixel(i).color(showColor);
                            }
                            strip.show();
                        }, 1000 / delay);
                    }

                    // Input a value 0 to 255 to get a color value.
                    // The colors are a transition r - g - b - back to r.
                    function colorWheel(WheelPos) {

                        WheelPos = 255 - WheelPos;

                        if (WheelPos < 85) {
                            r = 255 - WheelPos * 3;
                            g = 0;
                            b = WheelPos * 3;
                        } else if (WheelPos < 170) {
                            WheelPos -= 85;
                            r = 0;
                            g = WheelPos * 3;
                            b = 255 - WheelPos * 3;
                        } else {
                            WheelPos -= 170;
                            r = WheelPos * 3;
                            g = 255 - WheelPos * 3;
                            b = 0;
                        }
                        // returns a string with the rgb value to be used as the parameter
                        return "rgb(" + r + "," + g + "," + b + ")";
                    }
                    
                });
            }

        });

    });

    var state = false;
    setInterval(function() {
        io.sockets.emit('event:led:state', state = !state);
    }, 1000);

    console.log('Server Ready');
});

process.on('SIGINT', function() {
    motion.unexport();
    process.exit();
});
//Neopixel
