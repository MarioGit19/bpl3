import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { writeFileSync, unlinkSync } from "fs";
import { TypePrinter } from "../utils/typePrinter";
import { join } from "path";

describe("TypePrinter", () => {
  const testFile = join(process.cwd(), "type_printer_test.x");

  beforeAll(() => {
    // Create a temporary test file
    const code = `
frame add(a: i32, b: i32) ret i32 {
    return a + b;
}

frame main() ret i32 {
    local x: i32 = 10;
    local y: i32 = 20;
    local sum: i32 = call add(x, y);
    return sum;
}
    `;
    writeFileSync(testFile, code);
  });

  afterAll(() => {
    // Cleanup
    try {
      unlinkSync(testFile);
    } catch {}
  });

  it("should print type information for a simple program", () => {
    const printer = new TypePrinter();
    
    // Mock console.log to capture output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: any[]) => logs.push(args.join(" "));

    try {
      printer.printTypeTree(testFile);
    } finally {
      console.log = originalLog;
    }

    // Verify output contains expected types
    const output = logs.join("\n").replace(/\u001b\[\d+m/g, "");
    
    // Check for function return type
    expect(output).toContain("FunctionDeclaration -> (no type)");
    expect(output).toContain("frame add(a: i32, b: i32) ret i32");
    
    // Check for binary expression type
    expect(output).toContain("BinaryExpression -> i32");
    
    // Check for variable declaration type
    expect(output).toContain("VariableDeclaration -> (no type)");
    expect(output).toContain("local x: i32 = 10;");
    
    // Check for literal type
    expect(output).toContain("NumberLiteralExpr -> u64"); // 10 is parsed as u64 by default
    
    // Check for function call type
    expect(output).toContain("FunctionCall -> i32");
    
    // Check for identifier type
    expect(output).toContain("IdentifierExpr -> i32");
  });

  it("should print type information for structs and control flow", () => {
    const structTestFile = join(process.cwd(), "type_printer_struct_test.x");
    const code = `
struct Point {
    x: i32,
    y: i32,
}

frame main() ret i32 {
    local p: Point;
    p.x = 10;
    
    if p.x > 5 {
        return p.x;
    } else {
        return 0;
    }
}
    `;
    writeFileSync(structTestFile, code);

    const printer = new TypePrinter();
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: any[]) => logs.push(args.join(" "));

    try {
      printer.printTypeTree(structTestFile);
    } finally {
      console.log = originalLog;
      try { unlinkSync(structTestFile); } catch {}
    }

    const output = logs.join("\n").replace(/\u001b\[\d+m/g, "");

    // Check for struct declaration
    expect(output).toContain("StructureDeclaration -> (no type)");
    expect(output).toContain("x: i32");
    
    // Check for IfExpression
    expect(output).toContain("IfExpression -> (no type)");
    expect(output).toContain("Condition:");
    expect(output).toContain("Then:");
    expect(output).toContain("Else:");
  });

  it("should print type information for arrays and loops", () => {
    const arrayTestFile = join(process.cwd(), "type_printer_array_test.x");
    const code = `
frame main() {
    local arr: i32[5];
    local i: i32 = 0;
    
    loop {
        if i >= 5 {
            break;
        }
        arr[i] = i * 2;
        i = i + 1;
    }
}
    `;
    writeFileSync(arrayTestFile, code);

    const printer = new TypePrinter();
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: any[]) => logs.push(args.join(" "));

    try {
      printer.printTypeTree(arrayTestFile);
    } finally {
      console.log = originalLog;
      try { unlinkSync(arrayTestFile); } catch {}
    }

    const output = logs.join("\n").replace(/\u001b\[\d+m/g, "");

    // Check for array declaration
    expect(output).toContain("VariableDeclaration -> (no type)");
    expect(output).toContain("local arr: i32[5];");
    
    // Check for loop
    expect(output).toContain("LoopExpression -> (no type)");
    expect(output).toContain("Body:");
    
    // Check for array access
    expect(output).toContain("MemberAccessExpression -> i32"); // arr[i]
    expect(output).toContain("Index:");
    
    // Check for break
    expect(output).toContain("BreakExpression -> (no type)");
  });
});
