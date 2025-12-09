
declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

%struct.Point = type { i64, i64 }

@g_val = global i64 100
