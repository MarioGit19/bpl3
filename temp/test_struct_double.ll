@.str.0 = private unnamed_addr constant [19 x i8] c"Point(%.2f, %.2f)\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

%struct.PointD = type { double, double }

define i32 @main() {
entry:
  %p_ptr = alloca %struct.PointD, align 8
  %0 = insertvalue %struct.PointD undef, double 1.5, 0
  %1 = insertvalue %struct.PointD %0, double 2.5, 1
  store %struct.PointD %1, %struct.PointD* %p_ptr
  %4 = getelementptr inbounds %struct.PointD, %struct.PointD* %p_ptr, i32 0, i32 0
  %5 = load double, double* %4
  %6 = getelementptr inbounds %struct.PointD, %struct.PointD* %p_ptr, i32 0, i32 1
  %7 = load double, double* %6
  call void @printf(i8* getelementptr inbounds ([19 x i8], [19 x i8]* @.str.0, i64 0, i64 0), double %5, double %7)
  ret i32 0
}
