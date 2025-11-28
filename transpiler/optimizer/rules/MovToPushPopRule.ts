import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";
import { parseLine } from "../Utils";

export class MovToPushPopRule implements IOptimizationRule {
  priority = 100;

  canApply(lines: string[], index: number): boolean {
    if (index + 2 >= lines.length) return false;

    const curr = parseLine(lines[index]!);
    const next = parseLine(lines[index + 1]!);
    const next2 = parseLine(lines[index + 2]!);

    const movMatch = curr.code.match(/^mov\s+(rax),\s+(.+)$/);
    return !!(
      movMatch &&
      next.code === "push rax" &&
      next2.code.startsWith("pop ")
    );
  }

  apply(lines: string[], index: number): OptimizationResult {
    const curr = parseLine(lines[index]!);
    const next2 = parseLine(lines[index + 2]!);

    const movMatch = curr.code.match(/^mov\s+(rax),\s+(.+)$/);
    if (!movMatch) throw new Error("Apply called on invalid pattern");

    const val = movMatch[2];
    const popMatch = next2.code.match(/^pop\s+(.+)$/);

    if (popMatch) {
      const destReg = popMatch[1];
      return {
        newLines: [`    mov ${destReg}, ${val} ; optimized push/pop`],
        skipCount: 3,
      };
    }

    // Fallback if pop match fails (shouldn't happen if canApply is correct)
    return { newLines: [], skipCount: 0 };
  }
}
