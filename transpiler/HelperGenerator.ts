import type AsmGenerator from "./AsmGenerator";
import type Scope from "./Scope";

export default class HelperGenerator {
  static generateHelperFunctions(gen: AsmGenerator, scope: Scope) {
    HelperGenerator.generateItoAFunction(gen, scope);
    HelperGenerator.generateGetStringLengthFunction(gen, scope);
    HelperGenerator.generatePrintFunction(gen, scope);
    HelperGenerator.generatePrintIntegerFunction(gen, scope);
    HelperGenerator.generateExitFunction(gen, scope);
  }

  public static generatePrintFunction(gen: AsmGenerator, scope: Scope) {
    scope.defineFunction("print", "print");
    gen.emitLabel("print");
    // Function prologue
    gen.emit("push rbp");
    gen.emit("mov rbp, rsp");

    // Assuming the value to print is passed in rdi
    gen.emit("push rdi", "save value to print");
    gen.emit("mov rdi, rdi", "value to print");
    gen.emit("call str_len", "get string length");

    gen.emit("pop rsi", "restore value to print");
    gen.emit("mov rdx, rax", "length of string");
    gen.emit("mov rax, 1", "syscall: write");
    gen.emit("mov rdi, 1", "file descriptor: stdout");
    gen.emit("syscall");

    // Function epilogue
    gen.emit("mov rsp, rbp");
    gen.emit("pop rbp");
    gen.emit("ret");
  }

  public static generatePrintIntegerFunction(gen: AsmGenerator, scope: Scope) {
    scope.defineFunction("print_int", "print_int");
    gen.emitLabel("print_int");
    // Function prologue
    gen.emit("push rbp");
    gen.emit("mov rbp, rsp");

    // Assuming the integer to print is passed in rdi
    gen.emit("sub rsp, 32", "allocate space for string buffer");
    gen.emit("mov rsi, rsp", "buffer pointer");
    gen.emit("mov rdi, rdi", "integer to print");
    gen.emit("call my_itoa", "convert integer to string");
    gen.emit("push rax", "save string pointer");

    gen.emit("mov rdi, rax", "string to print");
    gen.emit("call str_len", "get string length");

    gen.emit("mov rdx, rax", "length of string");
    gen.emit("pop rsi", "string to print");
    gen.emit("mov rax, 1", "syscall: write");
    gen.emit("mov rdi, 1", "file descriptor: stdout");
    gen.emit("syscall");

    gen.emit("add rsp, 32", "deallocate string buffer");

    // Function epilogue
    gen.emit("mov rsp, rbp");
    gen.emit("pop rbp");
    gen.emit("ret");
  }

  public static generateExitFunction(gen: AsmGenerator, scope: Scope) {
    scope.defineFunction("exit", "exit");
    gen.emitLabel("exit");

    // Assuming the exit status is passed in rdi
    gen.emit("mov rax, 60", "syscall: exit");
    gen.emit("mov rdi, rdi", "status: exit code");
    gen.emit("syscall");
  }

  public static generateGetStringLengthFunction(
    gen: AsmGenerator,
    scope: Scope,
  ) {
    scope.defineFunction("str_len", "str_len");
    gen.emitLabel("str_len");

    // Assuming the string pointer is passed in rdi
    gen.emit("xor rcx, rcx", "length counter");
    gen.emitLabel("str_len_loop");
    gen.emit("cmp byte [rdi + rcx], 0", "check for null terminator");
    gen.emit("je str_len_end", "if null terminator, end loop");
    gen.emit("inc rcx", "increment length counter");
    gen.emit("jmp str_len_loop", "repeat loop");
    gen.emitLabel("str_len_end");

    // Return length in rax
    gen.emit("mov rax, rcx", "return length in rax");
    gen.emit("ret");
  }

  public static generateItoAFunction(gen: AsmGenerator, scope: Scope) {
    scope.defineFunction("itoa", "my_itoa");
    gen.emitLabel("my_itoa");

    // Function prologue
    gen.emit("push rbp");
    gen.emit("mov rbp, rsp");

    // Assuming the integer is passed in rdi and buffer pointer in rsi
    // Convert integer to string
    gen.emit("mov rax, rdi", "move integer to rax");
    gen.emit("mov rcx, 10", "base 10");
    gen.emitLabel("my_itoa_loop");
    gen.emit("xor rdx, rdx", "clear rdx for division");
    gen.emit("div rcx", "divide rax by 10");
    gen.emit("add rdx, '0'", "convert remainder to ASCII");
    gen.emit("push rdx", "push character onto stack");
    gen.emit("test rax, rax", "check if quotient is zero");
    gen.emit("jnz my_itoa_loop", "if not zero, continue loop");

    // Pop characters from stack into buffer
    gen.emitLabel("my_itoa_pop_loop");
    gen.emit("pop rdx", "pop character from stack");
    gen.emit("mov [rsi], dl", "store character in buffer");
    gen.emit("inc rsi", "move to next position in buffer");
    gen.emit("cmp rsp, rbp", "check if stack is empty");
    gen.emit("jne my_itoa_pop_loop", "if not empty, continue popping");

    // Null-terminate the string
    gen.emit("mov byte [rsi], 0", "null-terminate the string");

    // move result to rax (pointer to buffer)
    gen.emit("mov rax, rsi", "return pointer to buffer in rax");

    // Function epilogue
    gen.emit("mov rsp, rbp");
    gen.emit("pop rbp");
    gen.emit("ret");
  }
}
