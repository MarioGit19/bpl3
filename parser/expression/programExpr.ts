import HelperGenerator from "../../transpiler/HelperGenerator";
import type Scope from "../../transpiler/Scope";
import type { IRGenerator } from "../../transpiler/ir/IRGenerator";
import { IROpcode } from "../../transpiler/ir/IRInstruction";
import ExpressionType from "../expressionType";
import Expression from "./expr";
import type { IRType } from "../../transpiler/ir/IRType";

export default class ProgramExpr extends Expression {
  public constructor() {
    super(ExpressionType.Program);
  }

  expressions: Expression[] = [];

  public addExpression(expr: Expression): void {
    this.expressions.push(expr);
  }

  public toString(depth: number = 0): string {
    this.depth = depth;
    let output = this.getDepth();
    output += "[ Program ]\n";
    for (const expr of this.expressions) {
      output += expr.toString(this.depth + 1);
    }
    output += this.getDepth() + "/[ Program ]\n";
    return output;
  }

  public log(depth: number = 0): void {
    console.log(this.toString(depth));
  }

  optimize(): Expression {
    this.expressions = this.expressions.map((expr) => expr.optimize());
    return this;
  }

  validate(): void {
    // Ensure only few expr types are at the top level
    const allowedTopLevelTypes = new Set<ExpressionType>([
      ExpressionType.FunctionDeclaration,
      ExpressionType.VariableDeclaration,
      ExpressionType.ImportExpression,
      ExpressionType.ExportExpression,
      ExpressionType.StructureDeclaration,
      ExpressionType.ExternDeclaration,
      ExpressionType.EOF,
    ]);

    for (const expr of this.expressions) {
      if (!allowedTopLevelTypes.has(expr.type)) {
        throw new Error(
          `Invalid expression type at top level: ${ExpressionType[expr.type]}`,
        );
      }
    }
  }

  toIR(gen: IRGenerator, scope: Scope): string {
    this.validate();

    const weHaveExportStmt = this.expressions.find(
      (expr) => expr.type === ExpressionType.ExportExpression,
    );

    for (const expr of this.expressions) {
      expr.toIR(gen, scope);
    }

    if (!weHaveExportStmt) {
      const irArgs = [
        { name: "argc", type: { type: "i32" } as any },
        {
          name: "argv",
          type: { type: "pointer", base: { type: "i8" } } as any,
        },
        {
          name: "envp",
          type: { type: "pointer", base: { type: "i8" } } as any,
        },
      ];
      const irRet = { type: "i32" } as any;

      gen.createFunction("main", irArgs, irRet);
      const entry = gen.createBlock("entry");
      gen.setBlock(entry);

      const userMain = scope.resolveFunction("main");
      if (userMain) {
        const callArgs: { value: string; type: IRType }[] = [];
        if (userMain.args) {
          userMain.args.forEach((arg, index) => {
            if (index === 0)
              callArgs.push({ value: "%argc", type: { type: "i32" } });
            else if (index === 1)
              callArgs.push({
                value: "%argv",
                type: { type: "pointer", base: { type: "i8" } },
              });
            else if (index === 2)
              callArgs.push({
                value: "%envp",
                type: { type: "pointer", base: { type: "i8" } },
              });
          });
        }

        const retType = userMain.returnType
          ? gen.getIRType(userMain.returnType)
          : ({ type: "void" } as any);
        const res = gen.emitCall("user_main", callArgs, retType);

        if (retType.type === "void") {
          gen.emitReturn("0", { type: "i32" });
        } else {
          // Cast result to i32 if needed
          if (retType.type === "i64") {
            const trunc = gen.emitCast(
              IROpcode.TRUNC,
              res!,
              { type: "i32" },
              retType,
            );
            gen.emitReturn(trunc, { type: "i32" });
          } else if (retType.type === "i8" || retType.type === "i16") {
            const zext = gen.emitCast(
              IROpcode.ZEXT,
              res!,
              { type: "i32" },
              retType,
            );
            gen.emitReturn(zext, { type: "i32" });
          } else if (retType.type === "i32") {
            gen.emitReturn(res, { type: "i32" });
          } else {
            gen.emitReturn("0", { type: "i32" });
          }
        }
      } else {
        gen.emitReturn("0", { type: "i32" });
      }
    }
    return "";
  }
}
