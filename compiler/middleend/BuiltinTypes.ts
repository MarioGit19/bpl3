/**
 * Builtin type initialization for the BPL type checker
 * Provides base types, type aliases, and built-in struct definitions
 */

import * as AST from "../common/AST";
import type { SymbolTable } from "./SymbolTable";
import type { SourceLocation } from "../common/CompilerError";

/**
 * Internal location used for builtin type definitions
 */
export const INTERNAL_LOCATION: SourceLocation = {
  file: "internal",
  startLine: 0,
  startColumn: 0,
  endLine: 0,
  endColumn: 0,
};

/**
 * Base types that are fundamental to the language
 */
export const BASE_TYPES = [
  "i1",
  "i8",
  "u8",
  "i16",
  "u16",
  "i32",
  "u32",
  "i64",
  "u64",
  "double",
  "void",
  "null",
  "nullptr",
];

/**
 * Type aliases mapping user-friendly names to their underlying types
 */
export const TYPE_ALIASES: [string, string][] = [
  ["int", "i32"],
  ["uint", "u32"],
  ["float", "double"],
  ["bool", "i1"],
  ["char", "i8"],
  ["uchar", "u8"],
  ["short", "i16"],
  ["ushort", "u16"],
  ["long", "i64"],
  ["ulong", "u64"],
];

/**
 * Create a basic type node
 */
export function createBasicType(
  name: string,
  options: {
    pointerDepth?: number;
    genericArgs?: AST.TypeNode[];
    arrayDimensions?: number[];
    location?: SourceLocation;
  } = {}
): AST.BasicTypeNode {
  return {
    kind: "BasicType",
    name,
    genericArgs: options.genericArgs || [],
    pointerDepth: options.pointerDepth || 0,
    arrayDimensions: options.arrayDimensions || [],
    location: options.location || INTERNAL_LOCATION,
  };
}

/**
 * Create the NullAccessError struct declaration
 */
export function createNullAccessErrorDecl(): AST.StructDecl {
  return {
    kind: "StructDecl",
    name: "NullAccessError",
    genericParams: [],
    inheritanceList: [],
    members: [
      {
        kind: "StructField",
        name: "message",
        type: createBasicType("i8", { pointerDepth: 1 }),
        location: INTERNAL_LOCATION,
      },
      {
        kind: "StructField",
        name: "function",
        type: createBasicType("i8", { pointerDepth: 1 }),
        location: INTERNAL_LOCATION,
      },
      {
        kind: "StructField",
        name: "expression",
        type: createBasicType("i8", { pointerDepth: 1 }),
        location: INTERNAL_LOCATION,
      },
    ],
    location: INTERNAL_LOCATION,
  };
}

/**
 * Initialize all builtin types in a symbol table scope
 */
export function initializeBuiltinsInScope(scope: SymbolTable): void {
  // Register base types
  for (const name of BASE_TYPES) {
    const type = createBasicType(name);
    scope.define({
      name,
      kind: "TypeAlias",
      type,
      declaration: {
        kind: "TypeAlias",
        location: INTERNAL_LOCATION,
        name,
        type,
      } as any,
    });
  }

  // Register type aliases
  for (const [alias, target] of TYPE_ALIASES) {
    const type = createBasicType(target);
    scope.define({
      name: alias,
      kind: "TypeAlias",
      type,
      declaration: {
        kind: "TypeAlias",
        location: INTERNAL_LOCATION,
        name: alias,
        type,
      } as any,
    });
  }

  // Register string type (i8*)
  const stringType = createBasicType("i8", { pointerDepth: 1 });
  scope.define({
    name: "string",
    kind: "TypeAlias",
    type: stringType,
    declaration: {
      kind: "TypeAlias",
      location: INTERNAL_LOCATION,
      name: "string",
      type: stringType,
    } as any,
  });

  // Register NullAccessError struct type
  const nullAccessErrorDecl = createNullAccessErrorDecl();
  scope.define({
    name: "NullAccessError",
    kind: "Struct",
    type: createBasicType("NullAccessError"),
    declaration: nullAccessErrorDecl,
  });
}
