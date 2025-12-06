import { describe, expect, it } from "bun:test";

import Lexer from "../lexer/lexer";
import { Parser } from "../parser/parser";
import HelperGenerator from "../transpiler/HelperGenerator";
import { IRGenerator } from "../transpiler/ir/IRGenerator";
import Scope from "../transpiler/Scope";
import { LLVMTargetBuilder } from "../transpiler/target/LLVMTargetBuilder";

function generateIR(input: string): string {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer.tokenize());
  const program = parser.parse();
  const gen = new IRGenerator();
  const scope = new Scope();
  HelperGenerator.generateBaseTypes(scope);
  program.toIR(gen, scope);
  const builder = new LLVMTargetBuilder();
  return builder.build(gen.module);
}

describe("Try/Catch/Throw", () => {
  it("should generate try/catch block using setjmp", () => {
    const ir = generateIR(`
      frame test() {
        try {
           local x: u64 = 1;
        } catch (e: u64) {
           local y: u64 = e;
        }
      }
    `);
    
    // Check for ExceptionNode allocation
    expect(ir).toMatch(/%ExceptionNode = type/);
    expect(ir).toMatch(/alloca %ExceptionNode/);
    
    // Check for setjmp call
    expect(ir).toMatch(/call i32 @setjmp/);
    
    // Check for branching based on setjmp result
    expect(ir).toMatch(/icmp eq i32 %.*, 0/);
    expect(ir).toMatch(/br i1 %.*, label %try_block_\d+, label %catch_dispatch_\d+/);
    
    // Check for stack manipulation (push/pop)
    expect(ir).toMatch(/@__exception_stack_top/);
  });

  it("should generate throw expression using longjmp", () => {
    const ir = generateIR(`
      frame test() {
        throw 10;
      }
    `);

    // Check for __current_exception store
    expect(ir).toMatch(/store .* @__current_exception/);
    
    // Check for longjmp call
    expect(ir).toMatch(/call void @longjmp/);
  });

  it("should generate catch dispatch logic", () => {
    const ir = generateIR(`
      frame test() {
        try {
        } catch (e: u64) {
        } catch (e: *u8) {
        }
      }
    `);

    // Check for type ID loading
    expect(ir).toMatch(/load i32, ptr @__current_exception_type_id/);
    
    // Check for multiple catch blocks
    expect(ir).toMatch(/catch_match_0/);
    expect(ir).toMatch(/catch_match_1/);
    
    // Check for rethrow block (if no match found)
    expect(ir).toMatch(/rethrow/);
  });
});
