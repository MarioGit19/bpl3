import [MainTODO] from "./todo.bpl";

extern printf(fmt: *char, ...) ret int;

frame main() {
    printf("TODO Application Initialized\n");
    local app: MainTODO = MainTODO.new();
    local shouldExit: bool = false;
    loop {
        app.printMenu();
        local input: char = app.promptChar("Enter your choice: ");
        shouldExit = app.handleInput(input);
        if (shouldExit) {
            break;
        }
    }

    printf("Exiting TODO Application\n");
}
