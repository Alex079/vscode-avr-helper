## v2.2.1
- Fix arguments duplication for Atmel version of avr-size

## v2.2.0
- Make "Flash" task a custom execution
- Output generated shell commands
- Suggest "flash" memory by default
- Add a new "Quick" command which combines default "Build" and "Flash"
- Move "build" folder into project level
- Spawn async shell processes
- Minor improvements and cleanup

## v2.1.0

- Highlight build action by default
- Add option for HEX file output
- Fix additional programmer arguments

## v2.0.0

- AVR Helper extension is using built-in build system which should be compatible with all platforms; `make` is not required anymore
- `avr-gcc`, `avr-objdump`, `avr-size`, `avrdude` arguments and source/library folder scanner parameters can be configured in AVR Helper extension settings
- AVR Helper extension can auto-detect `avr-size` arguments specific to Atmel version
- MCU frequency is made optional
- Various bugfixes

## v1.1.5

- Support avrdude output with references like "\[c:\user1\softwares\winavr\bin\avrdude.conf:6185\]"

## v1.1.4

- Fix source files detection

## v1.1.3

- Fix status bar update
- Fix error handling
- Speed-up build

## v1.1.2

- Remove explicit dependency on bundled cpptools

## v1.1.1

- Set activation event

## v1.1.0

- Call programmer directly instead of using make
- Fix configuration defaults

## v1.0.2

- Extension icon
- Minor code improvements

## v1.0.1

- Search sources in subfolders

## v1.0.0

- Build
- Flash
