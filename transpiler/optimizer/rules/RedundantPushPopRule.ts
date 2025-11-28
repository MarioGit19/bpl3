import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";
import { parseLine } from "../Utils";

export class RedundantPushPopRule implements IOptimizationRule {
  priority = 80;

  canApply(lines: string[], index: number): boolean {
    if (index + 1 >= lines.length) return false;

    const curr = parseLine(lines[index]!);
    const next = parseLine(lines[index + 1]!);

    return curr.code.startsWith("push ") && next.code.startsWith("pop ");
  }

  apply(lines: string[], index: number): OptimizationResult {
    const curr = parseLine(lines[index]!);
    const next = parseLine(lines[index + 1]!);

    const pushReg = curr.code.substring(5).trim();
    const popReg = next.code.substring(4).trim();

    if (pushReg === popReg) {
      // push rax; pop rax -> removed
      return {
        newLines: [],
        skipCount: 2,
      };
    } else {
      // push rax; pop rbx -> mov rbx, rax
      return {
        newLines: [`    mov ${popReg}, ${pushReg} ; optimized push/pop`],
        skipCount: 2,
      };
    }
  }
}
