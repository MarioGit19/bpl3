import { describe, it, expect } from "bun:test";
import Lexer from "../lexer/lexer";
import { Parser } from "../parser/parser";
import AsmGenerator from "../transpiler/AsmGenerator";
import Scope from "../transpiler/Scope";
import HelperGenerator from "../transpiler/HelperGenerator";

function generate(input: string) {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer.tokenize());
  const program = parser.parse();
  const gen = new AsmGenerator(0);
  const scope = new Scope();
  HelperGenerator.generateBaseTypes(gen, scope);
  program.transpile(gen, scope);
  return gen.build();
}

describe("Division Semantics", () => {
    it("should generate float division for integers (u32 / u32 -> f32)", () => {
        const input = `
            frame test() {
                local a: u32 = 10;
                local b: u32 = 3;
                local c: f32 = a / b;
            }
        `;
        const asm = generate(input);
        // Should convert ints to floats
        expect(asm).toContain("cvtsi2sd");
        // Should use float division
        expect(asm).toContain("divsd");
        // Should convert result to f32 (cvtsd2ss) because result is f32
        expect(asm).toContain("cvtsd2ss");
    });

    it("should generate float division for integers (u64 / u64 -> f64)", () => {
        const input = `
            frame test() {
                local a: u64 = 10;
                local b: u64 = 3;
                local c: f64 = a / b;
            }
        `;
        const asm = generate(input);
        expect(asm).toContain("cvtsi2sd");
        expect(asm).toContain("divsd");
        // Should NOT convert result to f32 (except maybe for assignment if c was f32, but here c is f64)
        // Wait, if result is f64, and we assign to f64, no conversion needed.
        // But let's check that we don't see cvtsd2ss immediately after divsd for the result itself.
        // Actually, checking for absence of cvtsd2ss might be flaky if other parts use it.
        // But in this simple frame, it shouldn't appear.
        expect(asm).not.toContain("cvtsd2ss");
    });

    it("should generate integer division for integers (u32 // u32 -> u32)", () => {
        const input = `
            frame test() {
                local a: u32 = 10;
                local b: u32 = 3;
                local c: u32 = a // b;
            }
        `;
        const asm = generate(input);
        // Should use integer division
        expect(asm).toContain("idiv");
        // Should NOT use float division
        expect(asm).not.toContain("divsd");
    });

    it("should generate floor division for floats (f64 // f64 -> f64)", () => {
        const input = `
            frame test() {
                local a: f64 = 10.5;
                local b: f64 = 3.2;
                local c: f64 = a // b;
            }
        `;
        const asm = generate(input);
        expect(asm).toContain("divsd");
        expect(asm).toContain("roundsd"); // Floor
    });
});
