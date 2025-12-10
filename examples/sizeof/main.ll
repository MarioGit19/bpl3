@.str.0 = private unnamed_addr constant [16 x i8] c"Sizeof int: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [18 x i8] c"Sizeof Point: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

%struct.Point = type { i64, i64 }

define i64 @main() {
entry:
  %0 = getelementptr i64, i64* null, i32 1
  %1 = ptrtoint i64* %0 to i64
  call void @printf(i8* getelementptr inbounds ([16 x i8], [16 x i8]* @.str.0, i64 0, i64 0), i64 %1)
  %2 = getelementptr %struct.Point, %struct.Point* null, i32 1
  %3 = ptrtoint %struct.Point* %2 to i64
  call void @printf(i8* getelementptr inbounds ([18 x i8], [18 x i8]* @.str.1, i64 0, i64 0), i64 %3)
  ret i64 0
}
