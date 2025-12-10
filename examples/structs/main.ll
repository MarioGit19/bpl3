@.str.0 = private unnamed_addr constant [15 x i8] c"Point(%d, %d)\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

%struct.Point = type { i64, i64 }

define void @Point_print(%struct.Point %this) {
entry:
  %this_ptr = alloca %struct.Point
  store %struct.Point %this, %struct.Point* %this_ptr
  %0 = getelementptr inbounds %struct.Point, %struct.Point* %this_ptr, i32 0, i32 0
  %1 = load i64, i64* %0
  %2 = getelementptr inbounds %struct.Point, %struct.Point* %this_ptr, i32 0, i32 1
  %3 = load i64, i64* %2
  call void @printf(i8* getelementptr inbounds ([15 x i8], [15 x i8]* @.str.0, i64 0, i64 0), i64 %1, i64 %3)
  ret void
}

define i64 @main() {
entry:
  %p_ptr = alloca %struct.Point
  %0 = insertvalue %struct.Point undef, i64 10, 0
  %1 = insertvalue %struct.Point %0, i64 20, 1
  store %struct.Point %1, %struct.Point* %p_ptr
  %2 = load %struct.Point, %struct.Point* %p_ptr
  call void @Point_print(%struct.Point %2)
  ret i64 0
}
