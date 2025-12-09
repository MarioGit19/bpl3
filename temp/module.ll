
declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

define i64 @exportedFunc() {
entry:
  ret i64 100
}
