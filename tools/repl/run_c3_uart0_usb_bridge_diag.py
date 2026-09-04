#!/usr/bin/env python3
"""Exercise C3 UART0 through the onboard USB-UART under native-USB control."""

from __future__ import annotations

import argparse
import json
import os
import re
import termios
import time

import serial


def read_for(port: serial.Serial, seconds: float) -> bytes:
    deadline = time.monotonic() + seconds
    data = bytearray()
    while time.monotonic() < deadline:
        waiting = port.in_waiting
        if waiting:
            data.extend(port.read(waiting))
            deadline = time.monotonic() + 0.15
        else:
            time.sleep(0.02)
    return bytes(data)


def open_uart_without_reset(port: str) -> serial.Serial:
    uart = serial.Serial(
        port=None,
        baudrate=115200,
        timeout=0.1,
        rtscts=False,
        dsrdtr=False,
    )
    uart.dtr = False
    uart.rts = False
    uart.port = port
    uart.open()
    attrs = termios.tcgetattr(uart.fileno())
    attrs[2] &= ~termios.HUPCL
    termios.tcsetattr(uart.fileno(), termios.TCSANOW, attrs)
    return uart


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--console", default="/dev/ttyACM0")
    parser.add_argument("--uart", default="/dev/ttyUSB0")
    args = parser.parse_args()

    uart = open_uart_without_reset(args.uart)
    print("UART_PORT_HELD_OPEN=1", flush=True)
    print("Press the board RESET/EN button, then press Enter here.", flush=True)
    input()

    deadline = time.monotonic() + 12
    while not os.path.exists(args.console) and time.monotonic() < deadline:
        time.sleep(0.1)
    if not os.path.exists(args.console):
        print("DIAG_ERROR=NATIVE_USB_DID_NOT_RETURN", flush=True)
        return 2

    console = serial.Serial(args.console, 115200, timeout=0.1)
    console.reset_input_buffer()
    console.write(b"\x03\x03\n")
    console.flush()
    read_for(console, 0.3)

    console.write(b'echo(false);print("DIAG_CONSOLE="+E.getConsole());\n')
    console.flush()
    print(read_for(console, 0.5).decode("utf-8", "replace").strip())

    setup = (
        'Serial1.removeAllListeners("data");'
        'try{Serial1.unsetup();}catch(e){};'
        'Serial1.setup(115200,{tx:D21,rx:D20});'
        'var __uart0rx="";'
        'Serial1.on("data",function(d){__uart0rx+=d;});'
        'print("DIAG_READY=1");\n'
    )
    console.write(setup.encode())
    console.flush()
    print(read_for(console, 0.7).decode("utf-8", "replace").strip())

    host_to_uart0 = b"HOST_TO_UART0_0123456789"
    uart.reset_input_buffer()
    uart.write(host_to_uart0)
    uart.flush()
    time.sleep(0.5)
    console.write(b'print("DIAG_UART0_RX="+JSON.stringify(__uart0rx));\n')
    console.flush()
    rx_report = read_for(console, 0.7).decode("utf-8", "replace")
    print(rx_report.strip())

    uart0_to_host = b"UART0_TO_HOST_abcdefghijklmnopqrstuvwxyz"
    uart.reset_input_buffer()
    command = (
        b"Serial1.write("
        + json.dumps(uart0_to_host.decode()).encode()
        + b');print("DIAG_TX_SENT=1");\n'
    )
    console.write(command)
    console.flush()
    print(read_for(console, 0.5).decode("utf-8", "replace").strip())
    uart_capture = read_for(uart, 0.8)

    print("DIAG_UART_HOST_CAPTURE=" + json.dumps(uart_capture.decode("utf-8", "replace")))
    print("DIAG_EXPECTED_UART0_RX=" + json.dumps(host_to_uart0.decode()))
    print("DIAG_EXPECTED_HOST_CAPTURE=" + json.dumps(uart0_to_host.decode()))

    match = re.search(r'DIAG_UART0_RX=(".*")', rx_report)
    received = json.loads(match.group(1)) if match else None
    rx_ok = received == host_to_uart0.decode()
    tx_ok = uart_capture == uart0_to_host
    print(("PASS" if rx_ok else "FAIL") + " UART0_RX_FROM_USB_UART")
    print(("PASS" if tx_ok else "FAIL") + " UART0_TX_TO_USB_UART")

    console.close()
    uart.close()
    return 0 if rx_ok and tx_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
