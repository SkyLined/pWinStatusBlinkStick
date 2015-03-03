pWinStatusBlinkStick
===============

Show CPU usage and network connectivity status through BlinkStick.

--------------------------------------------------------------------------------

Getting Started
---------------
1. Install pWinStatusBlinkStick via NPM.
  
  `npm install pwinstatusblinkstick`
  
  Optionally: rename `pwinstatusblinkstick` to `pWinStatusBlinkStick`: npm is
  unable to handle the complexity of uppercase characters in a module name.
  Node on Windows does not have this problem, so renaming the folder is not
  required for you to use the module.

2. Run pWinStatusBlinkStick.
  
  `node pWinStatusBlinkStick`

--------------------------------------------------------------------------------

Notes
-----
### Including cWinPerfCounter in your public module

By default, `npm install` will only build for your processor architecture and
node version. If you want to include this addon in your node module for others
to use without requiring them to build cWinPerfCounter, it might be a good idea
to pre-build it for several common combinations of processor architecture and
node version.

To make this easier, I added the "build.cmd" script. This will read a list of
processor architecture and node version combinations from "build-targets.txt"
and build a cWinPerfCounter.node file for each. These files are stored in
separate sub-folders of the "addon" folder, and the "addon/index.js" attempts
to load the correct ".node" file for the user's node installation.

### How to find out what performance counters are available

You can either search the web, or you can run "perfmon.exe" on your machine and
follow these steps:
* open `Performance` -> `Monitoring Tools` -> `Performance Monitor`,
* right-click on the graph and select "Add Counters...",
* select and add the counters you are interested in, then click "Ok".
* right-click the graph again and select "Properties...",
* in the "Data" tab, you will see a list of the names of the performance
  counters you have selected. You should be able to use these names with
  cWinPerfCounter.

--------------------------------------------------------------------------------

### License
This code is licensed under [CC0 v1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
