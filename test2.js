var mBlinkStick = require("blinkstick"),
    mColor = require("mColor"),
    oBlinkStick = mBlinkStick.findFirst();
function fSetMode() {
  oBlinkStick.setMode(2, function (oError) {
    console.log("mode set:", oError);
    fSetMode();
  });
};
fSetMode();
