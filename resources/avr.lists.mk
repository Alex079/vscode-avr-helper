-include .vscode/avr.properties.mk

E.prog = $(AVR.programmer.tool) $(addprefix -C,$(AVR.programmer.definitions))
E.prog.opt = $(addprefix -P,$(AVR.programmer.port)) $(addprefix -b,$(AVR.programmer.rate)) -v
E.list.part = $(E.prog) -p\? | true
E.list.prog = $(E.prog) -c\? | true
E.list.info = $(E.prog) $(E.prog.opt) -p$(AVR.device.type) -c$(AVR.programmer.type)

.PHONY : list-part list-prog list-info

list-part :
	@$(E.list.part)

list-prog :
	@$(E.list.prog)

list-info :
	@$(E.list.info)
