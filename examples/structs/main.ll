@.str.0 = private unnamed_addr constant [15 x i8] c"Point(%d, %d)\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

%struct.Point = type { i32, i32 }

define void @Point_print(%struct.Point %this) {
entry:
  %this_ptr = alloca %struct.Point
  store %struct.Point %this, %struct.Point* %this_ptr
  %1 = getelementptr inbounds %struct.Point, %struct.Point* %this_ptr, i32 0, i32 0
  %2 = load i32, i32* %1
  %3 = getelementptr inbounds %struct.Point, %struct.Point* %this_ptr, i32 0, i32 1
  %4 = load i32, i32* %3
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([15 x i8], [15 x i8]* @.str.0, i64 0, i64 0), i32 %2, i32 %4)
  ret void
}

define i32 @main() {
entry:
  %p_ptr = alloca %struct.Point
  %0 = insertvalue %struct.Point undef, i32 10, 0
  %1 = insertvalue %struct.Point %0, i32 20, 1
  store %struct.Point %1, %struct.Point* %p_ptr
  %3 = load %struct.Point, %struct.Point* %p_ptr
  call void @Point_print(%struct.Point %3)
  ret i32 0
}
