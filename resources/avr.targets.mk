-include .vscode/avr.properties.mk

ifeq "$(AVR.source.compiler)" "$(notdir $(AVR.source.compiler))"
A.compiler.dir =
else
A.compiler.dir = $(dir $(AVR.source.compiler))
endif
A.libraries = $(addprefix -I,$(wildcard $(AVR.source.libraries:=/.) $(AVR.source.libraries:=/*/.) $(AVR.source.libraries:=/*/*/.)))
A.output.dir = .vscode/avr.build
A.elf = $(A.output.dir)/output.elf
A.list = $(A.output.dir)/output.lst
A.text = $(A.output.dir)/hex/text.hex
A.eeprom = $(A.output.dir)/hex/eeprom.hex
A.fuse = $(A.output.dir)/hex/fuse.hex
A.lock = $(A.output.dir)/hex/lock.hex
A.src = $(call F.dep,$(sort $(wildcard *.c) $(wildcard *.cpp)))
A.obj = $(addprefix $(A.output.dir)/obj/,$(addsuffix .o,$(basename $(A.src))))

F.dep.base = $(basename $1 $(filter %.h %.hpp,$(shell $(E.get.dep) $1)))
F.dep.1lvl = $(sort $(wildcard $(addsuffix .cpp,$(call F.dep.base,$1))) $(wildcard $(addsuffix .c,$(call F.dep.base,$1))))
F.dep = $(if $(filter-out '$1','$(call F.dep.1lvl,$1)'),$(call F.dep,$(call F.dep.1lvl,$1)),$1)

E.compiler = "$(AVR.source.compiler)" -DF_CPU=$(AVR.device.frequency) -mmcu=$(AVR.device.type) -pipe $(A.libraries)
E.get.dep = $(E.compiler) -MM
E.compile = $(E.compiler) -std=c++14 -g -Os -Wall -Wextra -pedantic -c -fpermissive -fno-exceptions -ffunction-sections -fdata-sections -fno-threadsafe-statics -MMD -flto
E.link = $(E.compiler) -Wall -Wextra -Os -g -flto -fuse-linker-plugin -Wl,--gc-sections -lm
E.objcopy = "$(A.compiler.dir)avr-objcopy" -O ihex
E.make.text = $(E.objcopy) -j .text -j .data
E.make.eeprom = $(E.objcopy) -j .eeprom --set-section-flags=.eeprom=alloc,load --no-change-warnings --change-section-lma .eeprom=0
E.make.fuse = $(E.objcopy) -j .fuse --no-change-warnings --change-section-lma .fuse=0
E.make.lock = $(E.objcopy) -j .lock --no-change-warnings --change-section-lma .lock=0
E.make.list = "$(A.compiler.dir)avr-objdump" --disassemble --source --line-numbers --demangle
E.get.size = "$(A.compiler.dir)avr-size" -A

E.prog.opt = $(addprefix -C,$(AVR.programmer.definitions)) $(addprefix -P,$(AVR.programmer.port)) $(addprefix -b,$(AVR.programmer.rate))
E.prog = $(AVR.programmer.tool) -v -p$(AVR.device.type) -c$(AVR.programmer.type) $(E.prog.opt)

.PHONY : clean build hex scan

build : $(A.list)
	@$(E.get.size) $(A.elf)

clean :
	@$(RM) -r $(A.output.dir)

hex : $(A.text) $(A.eeprom) $(A.fuse) $(A.lock) build

scan :
	$(info Found source files)
	$(info )
	$(foreach s,$(A.src),$(info $(realpath $(s))))
	$(info )


$(A.text) : $(A.elf)
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.make.text) $^ $@
	$(info )

$(A.eeprom) : $(A.elf)
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.make.eeprom) $^ $@
	$(info )

$(A.fuse) : $(A.elf)
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.make.fuse) $^ $@
	$(info )

$(A.lock) : $(A.elf)
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.make.lock) $^ $@
	$(info )

$(A.list) : $(A.elf)
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.make.list) $^ > $@
	$(info )

$(A.elf) : $(A.obj)
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.link) $^ -o $@
	$(info )

-include $(A.obj:.o=.d)

$(A.output.dir)/obj/%.o : %.c
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.compile) $< -o $@
	$(info )

$(A.output.dir)/obj/%.o : %.cpp
	@mkdir -p $(@D)
	$(info ===== Making $@)
	@$(E.compile) $< -o $@
	$(info )

.PHONY : erase flash boot application data apptable eeprom fuse fuse0 fuse1 fuse2 fuse3 fuse4 fuse5 lfuse hfuse efuse lock

erase :
	$(info ===== Erasing ALL)
	$(E.prog) -e

flash : $(A.elf)
	$(info ===== Flashing ROM)
	$(E.prog) -Uflash:w:$<:e

boot : $(A.elf)
	$(info ===== Flashing ROM)
	$(E.prog) -Uboot:w:$<:e

application : $(A.elf)
	$(info ===== Flashing ROM)
	$(E.prog) -Uapplication:w:$<:e

data : $(A.elf)
	$(info ===== Flashing ROM)
	$(E.prog) -Udata:w:$<:e

apptable : $(A.elf)
	$(info ===== Flashing ROM)
	$(E.prog) -Uapptable:w:$<:e

eeprom : $(A.elf)
	$(info ===== Flashing EEPROM)
	$(E.prog) -Ueeprom:w:$<:e

fuse : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ufuse:w:$<:e

fuse0 : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ufuse0:w:$<:e

fuse1 : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ufuse1:w:$<:e

fuse2 : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ufuse2:w:$<:e

fuse3 : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ufuse3:w:$<:e

fuse4 : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ufuse4:w:$<:e

fuse5 : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ufuse5:w:$<:e

lfuse : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Ulfuse:w:$<:e

hfuse : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Uhfuse:w:$<:e

efuse : $(A.elf)
	$(info ===== Flashing FUSE)
	$(E.prog) -Uefuse:w:$<:e

lock : $(A.elf)
	$(info ===== Flashing LOCK)
	$(E.prog) -Ulock:w:$<:e
