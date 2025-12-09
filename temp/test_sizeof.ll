@.str.0 = private unnamed_addr constant [18 x i8] c"sizeof(int) = %d\0A\00", align 1
@.str.1 = private unnamed_addr constant [20 x i8] c"sizeof(Point) = %d\0A\00", align 1
@.str.2 = private unnamed_addr constant [18 x i8] c"sizeof(arr) = %d\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare i64 @printf(i8*, ...)

%struct.Point = type { i64, i64 }

define i64 @main() {
entry:
  %0 = getelementptr i64, i64* null, i32 1
  %1 = ptrtoint i64* %0 to i64
  %2 = call i64 @printf(i8* getelementptr inbounds ([18 x i8], [18 x i8]* @.str.0, i64 0, i64 0), i64 %1)
  %3 = getelementptr %struct.Point, %struct.Point* null, i32 1
  %4 = ptrtoint %struct.Point* %3 to i64
  %5 = call i64 @printf(i8* getelementptr inbounds ([20 x i8], [20 x i8]* @.str.1, i64 0, i64 0), i64 %4)
  %arr_ptr = alloca [10 x i64]
  %6 = getelementptr [10 x i64], [10 x i64]* null, i32 1
  %7 = ptrtoint [10 x i64]* %6 to i64
  %8 = call i64 @printf(i8* getelementptr inbounds ([18 x i8], [18 x i8]* @.str.2, i64 0, i64 0), i64 %7)
  ret i64 0
}
