@.str.0 = private unnamed_addr constant [16 x i8] c"Sizeof int: %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [18 x i8] c"Sizeof Point: %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

%struct.Point = type { i32, i32 }

define i32 @main() {
entry:
  %1 = getelementptr i32, i32* null, i32 1
  %2 = ptrtoint i32* %1 to i64
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([16 x i8], [16 x i8]* @.str.0, i64 0, i64 0), i64 %2)
  %4 = getelementptr %struct.Point, %struct.Point* null, i32 1
  %5 = ptrtoint %struct.Point* %4 to i64
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([18 x i8], [18 x i8]* @.str.1, i64 0, i64 0), i64 %5)
  ret i32 0
}
