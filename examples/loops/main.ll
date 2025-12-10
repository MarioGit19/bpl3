@.str.0 = private unnamed_addr constant [4 x i8] c"%d \00", align 1
@.str.1 = private unnamed_addr constant [2 x i8] c"\0A\00", align 1

declare i8* @malloc(i64)
declare void @free(i8*)
declare void @exit(i32)

declare void @printf(i8*, ...)

define i32 @main() {
entry:
  %i_ptr = alloca i32
  store i32 0, i32* %i_ptr
  br label %cond.0
cond.0:
  br label %body.1
body.1:
  %1 = load i32, i32* %i_ptr
  %2 = icmp sge i32 %1, 5
  br i1 %2, label %then.3, label %merge.5
then.3:
  br label %end.2
merge.5:
  %4 = load i32, i32* %i_ptr
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* @.str.0, i64 0, i64 0), i32 %4)
  %5 = load i32, i32* %i_ptr
  %6 = add i32 %5, 1
  store i32 %6, i32* %i_ptr
  br label %cond.0
end.2:
  call void (i8*, ...) @printf(i8* getelementptr inbounds ([2 x i8], [2 x i8]* @.str.1, i64 0, i64 0))
  ret i32 0
}
