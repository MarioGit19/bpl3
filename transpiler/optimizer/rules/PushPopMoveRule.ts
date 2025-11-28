import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";

export class PushPopMoveRule implements IOptimizationRule {
  public priority = 85;

  public canApply(lines: string[], index: number): boolean {
    if (index + 2 >= lines.length) return false;

    const line1 = lines[index];
    const line2 = lines[index + 1];
    const line3 = lines[index + 2];

    if (!line1 || !line2 || !line3) return false;

    // Check for "push src" and "pop dest"
    const pushMatch = line1.match(/^\s*push\s+(.+?)\s*(;.*)?$/);
    const popMatch = line3.match(/^\s*pop\s+([a-z0-9]+)\s*(;.*)?$/);

    if (pushMatch && popMatch) {
      const dest = popMatch[1];
      if (dest && line2) {
        return this.isSafeInstruction(line2, dest);
      }
    }
    return false;
  }
  public apply(lines: string[], index: number): OptimizationResult {
    const line1 = lines[index]!;
    const line2 = lines[index + 1]!;
    const line3 = lines[index + 2]!;

    const pushMatch = line1.match(/^\s*push\s+(.+?)\s*(;.*)?$/);
    const popMatch = line3.match(/^\s*pop\s+([a-z0-9]+)\s*(;.*)?$/);

    if (pushMatch && popMatch) {
      const src = pushMatch[1];
      const dest = popMatch[1]!;
      const comment = pushMatch[2] ? pushMatch[2] : "";

      // Safety checks for the middle instruction
      if (this.isSafeInstruction(line2, dest)) {
        return {
          newLines: [
            `    mov ${dest}, ${src} ; optimized push/op/pop${comment}`,
            line2,
          ],
          skipCount: 3,
        };
      }
    }

    return { newLines: [line1], skipCount: 1 };
  }

  private isSafeInstruction(line: string, destReg: string): boolean {
    // Must not be a stack operation or control flow
    if (
      /^\s*(push|pop|call|ret|enter|leave|syscall|jmp|je|jne|jg|jl|jge|jle)\b/.test(
        line,
      )
    ) {
      return false;
    }

    // Must not reference the destination register (read or write)
    // We use a word boundary check to avoid partial matches (e.g. "ax" in "eax")
    const destRegex = new RegExp(`\\b${destReg}\\b`);
    if (destRegex.test(line)) {
      return false;
    }

    // Must not reference rsp (stack pointer)
    if (/\brsp\b/.test(line)) {
      return false;
    }

    return true;
  }
}
