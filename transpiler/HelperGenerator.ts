import type AsmGenerator from "./AsmGenerator";
import type Scope from "./Scope";

export default class HelperGenerator {
  static generateHelperFunctions(gen: AsmGenerator, scope: Scope) {
    HelperGenerator.generateGetStringLengthFunction(gen, scope);
    HelperGenerator.generatePrintFunction(gen, scope);
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
}
