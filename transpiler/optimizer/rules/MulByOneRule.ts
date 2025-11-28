import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";

export class MulByOneRule implements IOptimizationRule {
  public priority = 60;

  public canApply(lines: string[], index: number): boolean {
    const line = lines[index]!;
    // Matches "imul reg, 1"
    return /^\s*imul\s+[a-z0-9]+,\s*1\s*(;.*)?$/.test(line);
  }

  public apply(lines: string[], index: number): OptimizationResult {
    // Remove the line
    return {
      newLines: [],
      skipCount: 1,
    };
  }
}
