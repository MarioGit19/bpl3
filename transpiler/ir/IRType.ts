export type IRType =
  | { type: "void" }
  | { type: "i1" }
  | { type: "i8" }
  | { type: "i16" }
  | { type: "i32" }
  | { type: "i64" }
  | { type: "f32" }
  | { type: "f64" }
  | { type: "pointer"; base: IRType }
  | { type: "array"; base: IRType; size: number }
  | { type: "struct"; name: string; fields?: IRType[] };

export const IRVoid: IRType = { type: "void" };
export const IRI8: IRType = { type: "i8" };
export const IRI16: IRType = { type: "i16" };
export const IRI32: IRType = { type: "i32" };
export const IRI64: IRType = { type: "i64" };
export const IRF32: IRType = { type: "f32" };
export const IRF64: IRType = { type: "f64" };

export function isPointer(t: IRType): boolean {
  return t.type === "pointer";
}

export function isInteger(t: IRType): boolean {
  return ["i8", "i16", "i32", "i64"].includes(t.type);
}

export function isFloat(t: IRType): boolean {
  return ["f32", "f64"].includes(t.type);
}

export function irTypeToString(type: IRType): string {
  if (type.type === "void") return "void";
  if (type.type === "i8") return "i8";
  if (type.type === "i1") return "i1";
  if (type.type === "i16") return "i16";
  if (type.type === "i32") return "i32";
  if (type.type === "i64") return "i64";
  if (type.type === "f32") return "float";
  if (type.type === "f64") return "double";
  if (type.type === "pointer") return "ptr";
  if (type.type === "array")
    return `[${type.size} x ${irTypeToString(type.base!)}]`;
  if (type.type === "struct") {
    let name = type.name;
    if (name.includes("<") || name.includes(">") || name.includes(" ")) {
      name = `"${name}"`;
    }
    return `%${name}`;
  }
  return "void";
}
