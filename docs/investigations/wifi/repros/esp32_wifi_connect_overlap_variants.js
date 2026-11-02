// Characterise callback ownership when Wifi.connect() is called again while a
// connection attempt is active. The deliberately unavailable SSIDs avoid any
// dependency on credentials or an access point.
echo(false);

(function () {
  var wifi = require("Wifi");
  var runTag = String(Math.round(getTime() * 1000));
  var unavailableBase = "ESPRUINO_OVERLAP_" + runTag;
  var scenarioIndex = 0;
  var overallTimer;
  var scenarios = [
    {
      name:"two_callbacks",
      firstCallback:true,
      secondKind:"callback"
    },
    {
      name:"invalid_second_options",
      firstCallback:true,
      secondKind:"invalid_options"
    },
    {
      name:"callbackless_first",
      firstCallback:false,
      secondKind:"callback"
    }
  ];

  print("TEST=esp32_wifi_connect_overlap_variants");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  function complete() {
    clearTimeout(overallTimer);
    wifi.removeAllListeners();
    wifi.disconnect();
    print("PASS overlap_variants_observed");
    print("DONE=PASS");
  }

  function runNext() {
    if (scenarioIndex >= scenarios.length) {
      complete();
      return;
    }

    var scenario = scenarios[scenarioIndex++];
    var firstCount = 0;
    var secondCount = 0;
    var secondThrew = false;
    var secondReturned = false;
    var firstSSID = unavailableBase + "_A" + scenarioIndex;
    var secondSSID = unavailableBase + "_B" + scenarioIndex;

    print("INFO scenario_begin=" + scenario.name);

    function firstCallback(error) {
      firstCount++;
      print(
        "INFO first_callback=" +
        JSON.stringify({scenario:scenario.name, count:firstCount, error:error})
      );
    }

    function secondCallback(error) {
      secondCount++;
      print(
        "INFO second_callback=" +
        JSON.stringify({scenario:scenario.name, count:secondCount, error:error})
      );
    }

    if (scenario.firstCallback) {
      wifi.connect(firstSSID, {password:"not-a-real-password"}, firstCallback);
    } else {
      wifi.connect(firstSSID, {password:"not-a-real-password"});
    }

    try {
      if (scenario.secondKind === "invalid_options") {
        wifi.connect(secondSSID, {password:42}, secondCallback);
      } else {
        wifi.connect(
          secondSSID,
          {password:"another-not-real-password"},
          secondCallback
        );
      }
      secondReturned = true;
    } catch (error) {
      secondThrew = true;
      print(
        "INFO second_exception=" +
        JSON.stringify({scenario:scenario.name, error:String(error)})
      );
    }

    setTimeout(function () {
      wifi.disconnect();
      setTimeout(function () {
        print(
          "METRIC connect_overlap=" +
          JSON.stringify({
            scenario:scenario.name,
            firstCallbackCount:firstCount,
            secondCallbackCount:secondCount,
            secondReturned:secondReturned,
            secondThrew:secondThrew,
            status:wifi.getStatus(),
            ip:wifi.getIP()
          })
        );
        runNext();
      }, 2500);
    }, 2500);
  }

  overallTimer = setTimeout(function () {
    print("FAIL overall_timeout");
    print("DONE=FAIL");
  }, 30000);
  runNext();
}());
