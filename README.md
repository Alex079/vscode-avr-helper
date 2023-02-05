# AVR Helper Extension

Helper extension to simplify code compilation and flashing for AVR MCUs.

This extension allows building and flashing executable code for AVR from C/C++ source files. It needs `avr-gcc` and `avrdude` installed. It uses `C/C++` extension to provide language support.

## How it works

The goal of the extension is to provide a visual way of automating routine build and flash tasks.

The `AVR Helper` extension acts as a bridge between user-provided tools and does not include any MCU support code explicitly. The extension configuration leverages VSCode settings architecture.

Device list, programmer list, memory areas data is coming from `avrdude` output. The user is free to reconfigure the tools as required.
The `C/C++` extension is configured with user-provided `avr-gcc` and external source code libraries.

## Features

Demo: source highlighting, building and flashing.

![Demo: source highlighting, building and flashing](https://github.com/Alex079/vscode-avr-helper/wiki/images/setup-build-flash-v3.gif)

The AVR Helper adds six items to the window status bar:

### Status bar: AVR (command: Perform initial setup)

Displayed as `AVR`

This is the starting point to configure build system.
- C/C++ extension configuration file is created when this item is activated
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

This item triggers building of a currently open folder or a folder of currently displayed file. There are three options:
- Build: compile, link, disassemble, display ELF information
- Clean: remove the build output
- Scan: list all C/C++ files which will be used for build

The result of the build is `output.elf` file (optionally `output.lst` and `output.hex` as well) in the `build` folder.

### Status bar: Flash (command: Flash)

Displayed as `Flash`

This item triggers a connection to the device using the programmer to list all available memory areas of the currently connected device. The user can select memory areas to flash, these areas must be present in `output.elf` file sections for the operation to succeed. The build has to be run successfully and produce `output.elf` file before flashing.

### Status bar: Quick (command: Build and flash)

Displayed as `Quick`

This item triggers building and flashing with default options. This is equivalent to executing "Build" with option "Build" selected, skiping device check and immediately executing "Flash" with option "flash" selected.


## Requirements

- avr-gcc (compilation)
- avrdude (programmer driver and device capabilities)
- C/C++ extension (language support)

## Known Issues

Debug and simulation modes are not implemented.
