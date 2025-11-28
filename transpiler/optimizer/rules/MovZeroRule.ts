import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";
import { parseLine } from "../Utils";

export class MovZeroRule implements IOptimizationRule {
  priority = 50;

  canApply(lines: string[], index: number): boolean {
    const curr = parseLine(lines[index]!);
    return !!curr.code.match(/^mov\s+([a-z0-9]+),\s+0$/);
  }

  apply(lines: string[], index: number): OptimizationResult {
    const curr = parseLine(lines[index]!);
    const movZeroMatch = curr.code.match(/^mov\s+([a-z0-9]+),\s+0$/);

    if (!movZeroMatch) throw new Error("Apply called on invalid pattern");

    const reg = movZeroMatch[1];
    return {
      newLines: [`    xor ${reg}, ${reg} ; optimized mov 0`],
      skipCount: 1,
    };
  }
}
