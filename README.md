# AVR Helper Extension

Helper extension to simplify code compilation and flashing for AVR chips. This extension creates a C/C++ build system based on "make" in currently open folder. It needs make, avr-gcc, and avrdude installed. It uses C/C++ extension to provide language support.

## Features

Demo: source highlighting and build.

![Demo: source highlighting and build](https://github.com/Alex079/vscode-avr-helper/wiki/images/setup-and-build.gif)

The AVR Helper adds five items to the window status bar:

### Status bar: AVR (command: Perform initial setup)

Displayed as `AVR`

This is the starting point to configure build system.
- Makefiles are created when this item is clicked
- Step 1: choose avr-gcc executable file
- Step 2: choose avrdude executable file
- Step 3: choose avrdude.conf
- Step 4: choose additional source libraries

### Status bar: Device (command: Select device)

Displayed as `attiny85 | 1000000 Hz`

This item displays and allows for selecting MCU type and frequency.
- Step 1: select MCU type according to the configured avrdude and avrdude.conf
- Step 2: input MCU frequency in Hz

### Status bar: Programmer (command: Select programmer)

Displayed as `stk500v1 | /dev/ttyACM0 | 19200 Baud`

This item displays and allows for selecting programmer type, port, and baud rate.
- Step 1: select programmer type according to the configured avrdude and avrdude.conf
- Step 2: choose OS port to which the programmer is connected
- Step 3: input the port rate in baud

### Status bar: Build (command: Build)

Displayed as `Build`

This item triggers make of a currently open folder or a folder of currently displayed file. There are three options:
- build: compile, link, display ELF information
- clean: remove the build output
- scan: list all C/C++ files which will be used for build

### Status bar: Flash (command: Flash)

Displayed as `Flash`

This item triggers a connection to the device using the programmer to list all available memory areas of the currently connected device. The user can select memory areas to flash, these areas must be present in ELF file sections for the operation to succeed. The build is triggered automatically if needed before flashing.

## Requirements

- make (build system)
- avr-gcc (compilation)
- avrdude (programmer driver)
- C/C++ extension (language support)

## Extension Settings

This extension contributes the following settings:

|Setting|Value example|
|-|-|
|`AVR.source.compiler`|`/usr/bin/avr-c++`|
|`AVR.source.libraries`|`/home/demo/Arduino/libraries`|
|`AVR.device.type`|`attiny85`|
|`AVR.device.frequency`|`1000000`|
|`AVR.programmer.tool`|`/usr/bin/avrdude`|
|`AVR.programmer.definitions`|`/etc/avrdude.conf`|
|`AVR.programmer.type`|`stk500v1`|
|`AVR.programmer.port`|`/dev/ttyACM0`|
|`AVR.programmer.rate`|`19200`|

## Known Issues

Debug and simulation modes are not implemented
