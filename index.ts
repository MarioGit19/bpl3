import { Lexer } from "./src/Lexer";
import { Parser } from "./src/Parser";
import { TypeChecker } from "./src/TypeChecker";
import { CompilerError } from "./src/CompilerError";
import { ASTPrinter } from "./src/ASTPrinter";
import { CodeGenerator } from "./src/CodeGenerator";
import * as fs from "fs";

const args = process.argv.slice(2);

if (args.length !== 1) {
    console.error("Usage: bun index.ts <file>");
    process.exit(1);
}

const filePath = args[0]!;

try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lexer = new Lexer(content, filePath);
    const tokens = lexer.scanTokens();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    // console.log(JSON.stringify(ast, null, 2));

    const typeChecker = new TypeChecker();
    typeChecker.checkProgram(ast);
    
    console.log("Semantic analysis completed successfully.");
    
    const printer = new ASTPrinter();
    console.log(printer.print(ast));

    const generator = new CodeGenerator();
    const ir = generator.generate(ast);
    
    const outputPath = filePath.replace(/\.[^/.]+$/, "") + ".ll";
    fs.writeFileSync(outputPath, ir);
    console.log(`LLVM IR written to ${outputPath}`);

} catch (e) {
    if (e instanceof CompilerError) {
        console.error(e.toString());
    } else {
        console.error(`Error: ${e}`);
    }
    process.exit(1);
}
