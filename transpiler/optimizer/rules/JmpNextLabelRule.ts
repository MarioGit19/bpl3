import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";
import { parseLine } from "../Utils";

export class JmpNextLabelRule implements IOptimizationRule {
  priority = 70;

  canApply(lines: string[], index: number): boolean {
    if (index + 1 >= lines.length) return false;

    const curr = parseLine(lines[index]!);
    const next = parseLine(lines[index + 1]!);

    const jmpMatch = curr.code.match(/^jmp\s+(.+)$/);
    if (!jmpMatch) return false;

    const label = jmpMatch[1];
    // Check if next line is "LABEL:"
    return next.code === `${label}:`;
  }

  apply(lines: string[], index: number): OptimizationResult {
    // Remove the jmp, keep the label
    // We only skip the jmp instruction (index), the label (index+1) remains for the next iteration
    // but since we return newLines, we need to be careful.
    // If we return empty newLines and skipCount 1, we effectively remove the jmp.
    return {
      newLines: [],
      skipCount: 1,
    };
  }
}
