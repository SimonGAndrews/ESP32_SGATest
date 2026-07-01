#!/usr/bin/env python3
"""Run shared SPI flash checks against an ESP32_V1 Espruino REPL."""

from __future__ import annotations

import argparse
import re
import sys
import time

import serial


JS_TEST = r"""
echo(false);
function emit(name, value) {
  print(name + "=" + value);
}
function rdMcp3008() {
  var r = SPI1.send([1, 128, 0], D16);
  return ((r[1] & 3) << 8) | r[2];
}
function rdMcp3008Stable(pickHigh) {
  var best = rdMcp3008();
  for (var i = 0; i < 4; i++) {
    var value = rdMcp3008();
    if (pickHigh ? (value > best) : (value < best)) best = value;
  }
  return best;
}
function hex2(n) {
  return ("0" + n.toString(16)).slice(-2);
}
function bytesToHex(a) {
  var s = "";
  for (var i = 0; i < a.length; i++) s += hex2(a[i]);
  return s;
}
function finish() {
  digitalWrite(D27, 0);
  echo(true);
  print("DONE SPI_FLASH_BLOCK7");
}

SPI1.setup({miso:D19, mosi:D23, sck:D18});
pinMode(D27, "output");
pinMode(D34, "input");
digitalWrite(D27, 0);

emit("SPI_INFO", "FLASH_CS=D17 ADC_CS=D16");

setTimeout(function() {
  emit("ADC_SPI_LOW", rdMcp3008Stable(false));
  var jedec = SPI1.send([0x9F, 0, 0, 0], D17);
  emit("FLASH_JEDEC_RAW", bytesToHex(jedec));
  emit("FLASH_MFR", hex2(jedec[1]));
  emit("FLASH_TYPE", hex2(jedec[2]));
  emit("FLASH_CAP", hex2(jedec[3]));
  var sr1 = SPI1.send([0x05, 0], D17);
  emit("FLASH_SR1_RAW", bytesToHex(sr1));
  emit("FLASH_SR1", hex2(sr1[1]));
  digitalWrite(D27, 1);
  setTimeout(function() {
    emit("ADC_SPI_HIGH", rdMcp3008Stable(true));
    finish();
  }, 120);
}, 120);
"""


def read_available(ser: serial.Serial, duration: float) -> str:
    deadline = time.monotonic() + duration
    chunks: list[bytes] = []
    while time.monotonic() < deadline:
        waiting = ser.in_waiting
        if waiting:
            chunks.append(ser.read(waiting))
            deadline = time.monotonic() + 0.15
        else:
            time.sleep(0.02)
    return b"".join(chunks).decode("utf-8", "replace")


def send_and_capture(ser: serial.Serial, text: str, settle: float = 0.2) -> str:
    ser.write(text.encode("utf-8"))
    ser.flush()
    return read_available(ser, settle)


def read_until_marker(ser: serial.Serial, marker: str, timeout: float) -> str:
    deadline = time.monotonic() + timeout
    chunks: list[bytes] = []
    while time.monotonic() < deadline:
        waiting = ser.in_waiting
        if waiting:
            chunks.append(ser.read(waiting))
            text = b"".join(chunks).decode("utf-8", "replace")
            if marker in text:
                return text
        else:
            time.sleep(0.02)
    return b"".join(chunks).decode("utf-8", "replace")


def sync_repl(ser: serial.Serial) -> None:
    ser.reset_input_buffer()
    ser.reset_output_buffer()
    send_and_capture(ser, "\x03", settle=0.2)
    send_and_capture(ser, "\x03", settle=0.2)
    send_and_capture(ser, "\n", settle=0.2)
    send_and_capture(ser, "echo(true);\n", settle=0.15)


def parse_metrics(output: str) -> dict[str, str]:
    metrics: dict[str, str] = {}
    for line in output.splitlines():
        line = line.strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        metrics[key] = value
    return metrics


def check(name: str, ok: bool, detail: str) -> bool:
    print(("PASS " if ok else "FAIL ") + name + " " + detail)
    return ok


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()

    with serial.Serial(args.port, args.baud, timeout=0.1) as ser:
        sync_repl(ser)
        ser.reset_input_buffer()
        ser.write((JS_TEST + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE SPI_FLASH_BLOCK7", timeout=3.0)
        print(output.rstrip())

    if "DONE SPI_FLASH_BLOCK7" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    metrics = parse_metrics(output)
    required = {"ADC_SPI_LOW", "ADC_SPI_HIGH", "FLASH_JEDEC_RAW", "FLASH_MFR", "FLASH_TYPE", "FLASH_CAP", "FLASH_SR1"}
    missing = [name for name in required if name not in metrics]
    if missing:
        print("Missing SPI flash metrics: " + ", ".join(missing), file=sys.stderr)
        return 2

    try:
        adc_low = int(metrics["ADC_SPI_LOW"])
        adc_high = int(metrics["ADC_SPI_HIGH"])
    except ValueError:
        print("Bad ADC metrics.", file=sys.stderr)
        return 2

    mfr = metrics["FLASH_MFR"].lower()
    ftype = metrics["FLASH_TYPE"].lower()
    fcap = metrics["FLASH_CAP"].lower()
    sr1 = metrics["FLASH_SR1"].lower()
    jedec_raw = metrics["FLASH_JEDEC_RAW"].lower()

    ok = True
    ok &= check("SPI ADC low", adc_low < 50, f"value={adc_low}")
    ok &= check("SPI ADC high", adc_high > 950, f"value={adc_high}")
    ok &= check("SPI ADC span", (adc_high - adc_low) > 900, f"span={adc_high - adc_low}")
    ok &= check("Flash JEDEC shape", bool(re.fullmatch(r"[0-9a-f]{8}", jedec_raw)), f"raw={jedec_raw}")
    ok &= check("Flash manufacturer", mfr == "ef", f"mfr={mfr}")
    ok &= check("Flash type not blank", ftype not in {"00", "ff"}, f"type={ftype}")
    ok &= check("Flash capacity not blank", fcap not in {"00", "ff"}, f"cap={fcap}")
    ok &= check("Flash status register readable", sr1 != "ff", f"sr1={sr1}")

    if not ok:
        print("Detected failing shared SPI flash checks.", file=sys.stderr)
        return 1

    print("All Block 7 SPI flash checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
