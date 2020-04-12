-include .vscode/avr.properties.mk

E.prog = $(AVR.programmer.tool) $(addprefix -C,$(AVR.programmer.definitions))
E.list.part = $(E.prog) -p\? | true
E.list.prog = $(E.prog) -c\? | true

.PHONY : list-part list-prog

list-part :
	@$(E.list.part)

list-prog :
	@$(E.list.prog)
