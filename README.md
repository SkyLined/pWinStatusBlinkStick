pWinStatusBlinkStick
===============

Show CPU usage and network connectivity status through BlinkStick.

--------------------------------------------------------------------------------

Getting Started
---------------
_This will only work with a patched version of the BlinkStick node module.
See [this pull request](https://github.com/arvydas/blinkstick-node/pull/17) for
details._

1. Install pWinStatusBlinkStick via NPM.
  
  `npm install pwinstatusblinkstick`
  
  Optionally: rename `pwinstatusblinkstick` to `pWinStatusBlinkStick`: npm is
  unable to handle the complexity of uppercase characters in a module name.
  Node.js on Windows does not have this problem, so renaming the folder is not
  required for you to use the module.

2. Run pWinStatusBlinkStick.
  
  `node pWinStatusBlinkStick`

--------------------------------------------------------------------------------

Help
-----
```
Usage:
    pWinStatusBlinkStick.js [serial-number [serial-number [...] ] ] [options and switches]

Parameters:
    serial-number (string)
        Serial numbers of BlinkSticks to use
Options:
    --cpu-average=uint
        Interval over which CPU usage is averaged in ms
        default: 2000
    --cpu-heartbeat=uint-uint
        Interval of the "heartbeat" for idle and 100% CPU usage in ms
        default: [3000,1000]
    --cpu-polling=uint
        Interval between CPU usage checks in ms
        default: 40
    --frame-rate=uint
        Interval between BlinkStick color updates in ms
        default: 41
    --net-average=uint
        Interval over which net latency is averaged in ms
        default: 5000
    --net-polling=uint
        Interval between net connection checks in ms
        default: 100
    --net-timeout=uint
        Timeout for net connections in ms
        default: 500
    --net-url=string
        URL to request for net connection tests
        default: "http://clients3.google.com/generate_204"
    --night-time-brightness=float01
        Night time brightness as compared to day time brightness
        default: 0.25
Switches:
    --dual-led
        Show CPU usage and Network latency on alternating LEDs (requires WS2812 mode)
    --mode-inverse
        Use inverse mode for IKEA dioder attached to BlinkStick Pro
    --mode-multi-led
        Use WS2812 mode for multiple LEDs attached to a BlinkStick Pro
    --mode-normal
        Use normal mode for single LED attached to BlinkStick/BlinkStick Pro
    --show-blinksticks
        Output the serial numbers and modes of all selected BlinkSticks
```

Notes
-----
You may be interested in [pBackground](https://www.npmjs.com/package/pbackground),
which will allow you to run a Node.js script such as pWinStatusBlinkStick in the
background, without a console.
  ```
  C:\>npm install pbackground -g
  ...
  C:\>node-bkg pWinStatusBlinkStick
  ```
You can add a link to `node-bkg pWinStatusBlinkStick` to the Startup folder in
the start menu to run the script in the background as soon as you log into your
computer.

--------------------------------------------------------------------------------

### License
This code is licensed under [CC0 v1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
