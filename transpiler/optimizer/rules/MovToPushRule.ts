import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";
import { parseLine } from "../Utils";

export class MovToPushRule implements IOptimizationRule {
  priority = 90;

  canApply(lines: string[], index: number): boolean {
    if (index + 1 >= lines.length) return false;

    const curr = parseLine(lines[index]!);
    const next = parseLine(lines[index + 1]!);

    // We need to check next2 to ensure it's NOT a pop, because MovToPushPopRule should handle that.
    // However, the Optimizer will iterate rules. If MovToPushPopRule comes first, it will consume the lines.
    // So here we just check if it matches the pattern.
    // But wait, if we have `mov rax, 5; push rax; pop rdi`, and MovToPushPopRule is NOT enabled or fails,
    // this rule might trigger.
    // If this rule triggers, we get `push 5; pop rdi`.
    // Then RedundantPushPopRule might trigger on the next pass?
    // `push 5; pop rdi` -> `mov rdi, 5` (if RedundantPushPopRule handles immediates? No, it handles REGs).
    // So `push 5; pop rdi` is valid assembly.
    // So it is safe to apply this rule even if next2 is pop, IF MovToPushPopRule didn't apply.

    const movMatch = curr.code.match(/^mov\s+(rax),\s+(.+)$/);
    return !!(movMatch && next.code === "push rax");
  }

  apply(lines: string[], index: number): OptimizationResult {
    const curr = parseLine(lines[index]!);
    const movMatch = curr.code.match(/^mov\s+(rax),\s+(.+)$/);

    if (!movMatch) throw new Error("Apply called on invalid pattern");

    const val = movMatch[2];
    return {
      newLines: [`    push ${val} ; optimized mov/push`],
      skipCount: 2,
    };
  }
}
