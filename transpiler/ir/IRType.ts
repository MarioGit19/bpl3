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
