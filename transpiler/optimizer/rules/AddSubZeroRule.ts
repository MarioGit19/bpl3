import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";
import { parseLine } from "../Utils";

export class AddSubZeroRule implements IOptimizationRule {
  priority = 60;

  canApply(lines: string[], index: number): boolean {
    const curr = parseLine(lines[index]!);
    return !!curr.code.match(/^(add|sub)\s+[a-z0-9]+,\s+0$/);
  }

  apply(lines: string[], index: number): OptimizationResult {
    // Remove add/sub reg, 0
    return {
      newLines: [],
      skipCount: 1,
    };
  }
}
