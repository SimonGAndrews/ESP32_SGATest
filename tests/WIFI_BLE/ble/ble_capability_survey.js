// Survey the Espruino BLE API surface required by Supervisor Peer tests.

(function () {
  var required = [
    "setAdvertising",
    "setServices",
    "requestDevice",
    "findDevices",
    "getAddress",
    "disconnect"
  ];
  var optional = [
    "updateServices",
    "setScan",
    "setScanResponse",
    "getSecurityStatus",
    "restart",
    "sleep",
    "wake"
  ];
  var failures = 0;

  function check(name, isRequired) {
    var observed = typeof NRF[name];
    print("INFO ble_api=" + JSON.stringify({
      name : name,
      type : observed,
      required : isRequired
    }));
    if (isRequired) {
      if (observed === "function") print("PASS ble_api_" + name);
      else {
        failures++;
        print("FAIL ble_api_" + name + " observed=" + observed);
      }
    }
  }

  print("TEST=ble_capability_survey");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  print("INFO ble_address=" + JSON.stringify(NRF.getAddress()));
  required.forEach(function (name) { check(name, true); });
  optional.forEach(function (name) { check(name, false); });
  print("METRIC checks_failed=" + failures);
  print("DONE=" + (failures ? "FAIL" : "PASS"));
})();
