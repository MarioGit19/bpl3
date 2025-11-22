#!/bin/bash

fileName="${1%%.*}" # remove .s extension
outputFile="$(basename "$1" .x)"

echo "Compiling and running TypeScript file: $1"
bun index.ts $1
echo;

echo "Assembling and linking assembly file: ${fileName}.asm"
nasm -f elf64 ${fileName}".asm"
ld "${fileName}.o" -o ${outputFile} -lc --dynamic-linker /lib64/ld-linux-x86-64.so.2
rm "${fileName}.o"

echo "Running the output file: ${outputFile}"
echo "-----------------------------------";
[ "$2" == "-g" ] && gdb -q ${outputFile} || ./${outputFile}
