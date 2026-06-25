// Pico watch/debounce stress repro for direct use in the Espruino Web IDE.
//
// Wiring:
//   B3 -> 470R -> B4
//   B5 optional logic-analyser marker
//
// Control run:
//   set STRESSED = false
//
// Stressed run:
//   set STRESSED = true
//
// Expected:
//   control  -> SEEN=[1,0,1,0]
//   stressed -> may collapse to SEEN=[1,0]

echo(false);

var OUT = B3;
var IN = B4;
var MARK = B5;

var STRESSED = true;
var DEBOUNCE_MS = 20;
var PULSE = [20,20,20];
var TRIGGER_MS = 5;
var TRIGGER_WIDTH_MS = 5;
var START_MS = 20;
var BUSY_START_MS = 35;
var BUSY_MS = 120;

if (global._picoWatchId) {
  clearWatch(global._picoWatchId);
  delete global._picoWatchId;
}

pinMode(OUT, "output");
pinMode(IN, "input");
pinMode(MARK, "output");
digitalWrite(OUT, 0);
digitalWrite(MARK, 0);

var seen = [];
var edgeCount = 0;

function busyWait(ms) {
  var t = getTime() + ms/1000;
  while (getTime() < t) {}
}

global._picoWatchId = setWatch(function(e) {
  edgeCount++;
  seen.push(e.state ? 1 : 0);
  print("EDGE_" + edgeCount + "=" + JSON.stringify({
    state : e.state ? 1 : 0,
    time : e.time,
    lastTime : e.lastTime
  }));
}, IN, {repeat:true, edge:"both", debounce:DEBOUNCE_MS});

setTimeout(function() {
  digitalWrite(MARK, 1);
}, TRIGGER_MS);

setTimeout(function() {
  digitalWrite(MARK, 0);
}, TRIGGER_MS + TRIGGER_WIDTH_MS);

setTimeout(function() {
  print("PULSE_START");
  digitalPulse(OUT, 1, PULSE);
}, START_MS);

if (STRESSED) {
  setTimeout(function() {
    print("BUSY_ON");
    digitalWrite(MARK, 1);
  }, BUSY_START_MS);

  setTimeout(function() {
    busyWait(BUSY_MS);
  }, BUSY_START_MS + 1);

  setTimeout(function() {
    digitalWrite(MARK, 0);
    print("BUSY_OFF");
  }, BUSY_START_MS + BUSY_MS + 2);
}

setTimeout(function() {
  clearWatch(global._picoWatchId);
  delete global._picoWatchId;
  print("EDGE_COUNT=" + edgeCount);
  print("SEEN=" + JSON.stringify(seen));
  print("FINAL=" + digitalRead(IN));
  print("DONE PICO_WATCH");
  echo(true);
}, START_MS + BUSY_MS + 320);
