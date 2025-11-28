import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";
import { parseLine } from "../Utils";

export class MovRegToSameRegRule implements IOptimizationRule {
  priority = 60;

  canApply(lines: string[], index: number): boolean {
    const curr = parseLine(lines[index]!);
    // Matches "mov reg, reg" where both regs are the same
    // We use a backreference \1 to match the first capture group
    return !!curr.code.match(/^mov\s+([a-z0-9]+),\s+\1$/);
  }

  apply(lines: string[], index: number): OptimizationResult {
    // Just remove the line
    return {
      newLines: [],
      skipCount: 1,
    };
  }
}
