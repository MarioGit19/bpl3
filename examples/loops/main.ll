@.str.0 = private unnamed_addr constant [4 x i8] c"%d \00", align 1
@.str.1 = private unnamed_addr constant [2 x i8] c"\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i64 @main() {
entry:
  %i_ptr = alloca i64
  store i64 0, i64* %i_ptr
  br label %cond.0
cond.0:
  br label %body.1
body.1:
  %0 = load i64, i64* %i_ptr
  %1 = icmp sge i64 %0, 5
  br i1 %1, label %then.3, label %merge.5
then.3:
  br label %end.2
merge.5:
  %2 = load i64, i64* %i_ptr
  call void @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* @.str.0, i64 0, i64 0), i64 %2)
  %3 = load i64, i64* %i_ptr
  %4 = add i64 %3, 1
  store i64 %4, i64* %i_ptr
  br label %cond.0
end.2:
  call void @printf(i8* getelementptr inbounds ([2 x i8], [2 x i8]* @.str.1, i64 0, i64 0))
  ret i64 0
}
