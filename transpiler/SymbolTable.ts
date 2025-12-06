import type { VariableType } from "../parser/expression/variableDeclarationExpr";
import type FunctionDeclarationExpr from "../parser/expression/functionDeclaration";
import Token from "../lexer/token";
import type Scope from "./Scope";

export interface VarInfo {
  type: "local" | "global";
  offset: string;
  varType: VariableType;
  isParameter?: boolean;
  declaration?: Token;
  sourceFile?: string;
  usageCount?: number; // Track number of times variable is used
  llvmName?: string;
  irName?: string;
}

export type FunctionInfo = {
  name: string;
  label: string;
  startLabel: string;
  endLabel: string;
  args: { type: VariableType; name: string }[];
  returnType: VariableType | null;
  isExternal?: boolean;
  isVariadic?: boolean;
  variadicType?: VariableType | null;
  declaration?: Token;
  sourceFile?: string;
  llvmName?: string;
  irName?: string;
  isMethod?: boolean;
  receiverStruct?: string;
  originalName?: string;
  genericParams?: string[];
  astDeclaration?: FunctionDeclarationExpr; // Store AST for monomorphization
  definitionScope?: Scope;
};

export class SymbolTable {
  private vars = new Map<string, VarInfo>();
  private functions = new Map<string, FunctionInfo>();

  constructor(private parent?: SymbolTable) {}

  addVariable(name: string, info: VarInfo) {
    this.vars.set(name, info);
  }

  getVariable(name: string): VarInfo | undefined {
    return this.vars.get(name) || this.parent?.getVariable(name);
  }

  addFunction(name: string, info: FunctionInfo) {
    this.functions.set(name, info);
  }

  getFunction(name: string): FunctionInfo | undefined {
    return this.functions.get(name) || this.parent?.getFunction(name);
  }

  getVariables(): Map<string, VarInfo> {
    return this.vars;
  }

  getFunctions(): Map<string, FunctionInfo> {
    return this.functions;
  }
}
