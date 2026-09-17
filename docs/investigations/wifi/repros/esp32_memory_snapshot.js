// Report the Espruino JsVar allocation and the native ESP-IDF heap state.
// This is intentionally read-only and does not start Wi-Fi or Bluetooth.

(function () {
  var memory = process.memory();
  var state = ESP32.getState();

  print("TEST=esp32_memory_snapshot");
  print("TARGET=" + process.env.BOARD);
  print("INFO memory=" + JSON.stringify({
    nativeFreeHeap : state.freeHeap,
    nativeMinimumHeap : state.minHeap,
    largestNativeBlock : memory.tx && memory.tx.largest_block,
    jsVarsTotal : memory.total,
    jsVarsFree : memory.free,
    jsVarBlockSize : memory.blocksize
  }));
  print("DONE=PASS");
}());
