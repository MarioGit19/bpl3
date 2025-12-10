@.str.0 = private unnamed_addr constant [17 x i8] c"t && !f is true\0A\00", align 1
@.str.1 = private unnamed_addr constant [16 x i8] c"f || t is true\0A\00", align 1
@.str.2 = private unnamed_addr constant [23 x i8] c"f && t is true (fail)\0A\00", align 1
@.str.3 = private unnamed_addr constant [17 x i8] c"f && t is false\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i64 @main() {
entry:
  %t_ptr = alloca i1
  store i1 1, i1* %t_ptr
  %f_ptr = alloca i1
  store i1 0, i1* %f_ptr
  %0 = load i1, i1* %t_ptr
  %and_res_0_ptr = alloca i1
  br i1 %0, label %and.true.2, label %and.false.1
and.false.1:
  store i1 0, i1* %and_res_0_ptr
  br label %and.end.3
and.true.2:
  %1 = load i1, i1* %f_ptr
  %2 = icmp eq i1 %1, 0
  store i1 %2, i1* %and_res_0_ptr
  br label %and.end.3
and.end.3:
  %3 = load i1, i1* %and_res_0_ptr
  br i1 %3, label %then.4, label %merge.6
then.4:
  call void @printf(i8* getelementptr inbounds ([17 x i8], [17 x i8]* @.str.0, i64 0, i64 0))
  br label %merge.6
merge.6:
  %4 = load i1, i1* %f_ptr
  %or_res_7_ptr = alloca i1
  br i1 %4, label %or.true.8, label %or.false.9
or.true.8:
  store i1 1, i1* %or_res_7_ptr
  br label %or.end.10
or.false.9:
  %5 = load i1, i1* %t_ptr
  store i1 %5, i1* %or_res_7_ptr
  br label %or.end.10
or.end.10:
  %6 = load i1, i1* %or_res_7_ptr
  br i1 %6, label %then.11, label %merge.13
then.11:
  call void @printf(i8* getelementptr inbounds ([16 x i8], [16 x i8]* @.str.1, i64 0, i64 0))
  br label %merge.13
merge.13:
  %7 = load i1, i1* %f_ptr
  %and_res_14_ptr = alloca i1
  br i1 %7, label %and.true.16, label %and.false.15
and.false.15:
  store i1 0, i1* %and_res_14_ptr
  br label %and.end.17
and.true.16:
  %8 = load i1, i1* %t_ptr
  store i1 %8, i1* %and_res_14_ptr
  br label %and.end.17
and.end.17:
  %9 = load i1, i1* %and_res_14_ptr
  br i1 %9, label %then.18, label %else.19
then.18:
  call void @printf(i8* getelementptr inbounds ([23 x i8], [23 x i8]* @.str.2, i64 0, i64 0))
  br label %merge.20
else.19:
  call void @printf(i8* getelementptr inbounds ([17 x i8], [17 x i8]* @.str.3, i64 0, i64 0))
  br label %merge.20
merge.20:
  ret i64 0
}
