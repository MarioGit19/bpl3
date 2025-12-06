import type { VariableType } from "../parser/expression/variableDeclarationExpr";
import Token from "../lexer/token";
import type Scope from "./Scope";

export type InfoType = {
  description: string;
  signed?: boolean;
  [key: string]: any;
};

export type TypeInfo = {
  name: string;
  isPointer: number;
  isArray: number[];
  size: number;
  offset?: number;
  alignment?: number;
  isPrimitive: boolean;
  members: Map<string, TypeInfo>;
  info: InfoType;
  declaration?: Token;
  sourceFile?: string;
  genericParams?: string[];
  genericFields?: { name: string; type: VariableType }[];
  genericMethods?: any[]; // Store method AST nodes for generic structs
  definingScope?: Scope; // The scope where this type was originally defined (for generic instantiation)
  index?: number;
  parentType?: string;
};

export class TypeRegistry {
  private types = new Map<string, TypeInfo>();

  constructor(private parent?: TypeRegistry) {}

  addType(name: string, info: TypeInfo) {
    this.types.set(name, info);
  }

  getType(name: string): TypeInfo | undefined {
    return this.types.get(name) || this.parent?.getType(name);
  }

  hasType(name: string): boolean {
    return this.types.has(name) || (this.parent?.hasType(name) ?? false);
  }

  getTypes(): Map<string, TypeInfo> {
    return this.types;
  }
}
