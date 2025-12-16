import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

import { CodeGenerator } from "../../compiler/backend/CodeGenerator";
import * as AST from "../../compiler/common/AST";
import { CompilerError } from "../../compiler/common/CompilerError";
import { DiagnosticFormatter } from "../../compiler/common/DiagnosticFormatter";
import { Formatter } from "../../compiler/formatter/Formatter";
import { lexWithGrammar } from "../../compiler/frontend/GrammarLexer";
import { Parser } from "../../compiler/frontend/Parser";
import { Compiler } from "../../compiler/index";
import { TypeChecker } from "../../compiler/middleend/TypeChecker";

const execAsync = promisify(exec);

// Create formatter with specific settings for playground
const diagnosticFormatter = new DiagnosticFormatter({
  colorize: false, // JSON API, don't use ANSI colors
  contextLines: 3,
  showCodeSnippets: true,
});

// Helper to stringify AST avoiding circular references
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    },
    2,
  );
}

interface CompileRequest {
  code: string;
  input?: string;
  args?: string[];
}

interface CompileResponse {
  success: boolean;
  output?: string;
  error?: string;
  warnings?: string[];
  ir?: string;
  ast?: string;
  tokens?: string;
}

// Get examples
function getExamples() {
  const examplesDir = path.join(__dirname, "../examples");
  const examples: any[] = [];

  if (fs.existsSync(examplesDir)) {
    const files = fs
      .readdirSync(examplesDir)
      .filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(examplesDir, file), "utf-8");
        examples.push(JSON.parse(content));
      } catch (e) {
        console.error(`Failed to load example ${file}:`, e);
      }
    }
  }

  // Sort by order
  examples.sort((a, b) => (a.order || 0) - (b.order || 0));
  return examples;
}

// Compile and run BPL code
async function compileAndRun(req: CompileRequest): Promise<CompileResponse> {
  const tempDir = path.join("/tmp", `bpl-playground-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const sourceFile = path.join(tempDir, "main.bpl");
  const irFile = path.join(tempDir, "main.ll");
  const binFile = path.join(tempDir, "main");
  const inputFile = path.join(tempDir, "input.txt");

  try {
    // Write source file
    fs.writeFileSync(sourceFile, req.code, "utf-8");

    // Write input file if provided
    if (req.input) {
      fs.writeFileSync(inputFile, req.input, "utf-8");
    }

    const warnings: string[] = [];
    let ast: AST.Program | undefined;
    let tokens: any[] = [];
    let ir = "";

    // Get tokens (always do this for visualization)
    try {
      tokens = lexWithGrammar(req.code, sourceFile);
    } catch (e) {
      // Ignore lexing errors here, let compiler catch them
    }

    // Compile using Compiler class
    try {
      const compiler = new Compiler({
        filePath: sourceFile,
        outputPath: irFile,
        emitType: "llvm",
        resolveImports: true,
        verbose: false,
      });

      const result = compiler.compile(req.code);

      if (!result.success) {
        const errorMsg = result.errors
          ? diagnosticFormatter.formatErrors(result.errors)
          : "Unknown compilation error";
        return {
          success: false,
          error: errorMsg,
          tokens: JSON.stringify(tokens, null, 2),
        };
      }

      ir = result.output || "";
      ast = result.ast;

      fs.writeFileSync(irFile, ir, "utf-8");
    } catch (e: any) {
      return {
        success: false,
        error: e instanceof CompilerError ? e.message : String(e),
        tokens: JSON.stringify(tokens, null, 2),
      };
    }

    // Compile IR to binary using clang
    try {
      await execAsync(`clang -o "${binFile}" "${irFile}" -Wno-override-module`);
    } catch (e: any) {
      return {
        success: false,
        error: `LLVM compilation failed: ${e.stderr || e.message}`,
        ir,
        ast: safeStringify(ast),
        tokens: JSON.stringify(tokens, null, 2),
      };
    }

    // Run the binary
    try {
      const args = req.args || [];
      const argsStr = args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ");
      const inputRedirect = req.input ? ` < "${inputFile}"` : "";
      const cmd = `"${binFile}" ${argsStr}${inputRedirect}`;

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 5000, // 5 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      return {
        success: true,
        output: stdout + (stderr ? `\nSTDERR:\n${stderr}` : ""),
        warnings,
        ir,
        ast: safeStringify(ast),
        tokens: JSON.stringify(tokens, null, 2),
      };
    } catch (e: any) {
      if (e.killed) {
        return {
          success: false,
          error: "Execution timeout (5 seconds)",
          ir,
          ast: safeStringify(ast),
          tokens: JSON.stringify(tokens, null, 2),
        };
      }
      return {
        success: false,
        error: `Runtime error: ${e.stderr || e.message}`,
        output: e.stdout || "",
        ir,
        ast: safeStringify(ast),
        tokens: JSON.stringify(tokens, null, 2),
      };
    }
  } finally {
    // Cleanup
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Cleanup failed:", e);
    }
  }
}

// Server
const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // POST /format
    if (url.pathname === "/format" && req.method === "POST") {
      try {
        const body = (await req.json()) as { code: string };

        // Parse code first
        const parser = new Parser(body.code, "temp.bpl");
        const ast = parser.parse();

        // Format the AST
        const formatter = new Formatter();
        const formatted = formatter.format(ast);

        return new Response(
          JSON.stringify({ success: true, code: formatted }),
          { headers },
        );
      } catch (e: any) {
        return new Response(
          JSON.stringify({ success: false, error: e.message }),
          { status: 500, headers },
        );
      }
    }

    // GET /examples
    if (url.pathname === "/examples" && req.method === "GET") {
      return new Response(JSON.stringify(getExamples()), { headers });
    }

    // POST /compile
    if (url.pathname === "/compile" && req.method === "POST") {
      try {
        const body = (await req.json()) as CompileRequest;
        const result = await compileAndRun(body);
        return new Response(JSON.stringify(result), { headers });
      } catch (e: any) {
        return new Response(
          JSON.stringify({ success: false, error: e.message }),
          { status: 500, headers },
        );
      }
    }

    // Static files
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = fs.readFileSync(
        path.join(__dirname, "../frontend/index.html"),
        "utf-8",
      );
      return new Response(html, {
        headers: { ...headers, "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/style.css") {
      const css = fs.readFileSync(
        path.join(__dirname, "../frontend/style.css"),
        "utf-8",
      );
      return new Response(css, {
        headers: { ...headers, "Content-Type": "text/css" },
      });
    }

    if (url.pathname === "/app.js") {
      const js = fs.readFileSync(
        path.join(__dirname, "../frontend/app.js"),
        "utf-8",
      );
      return new Response(js, {
        headers: { ...headers, "Content-Type": "application/javascript" },
      });
    }

    return new Response("Not Found", { status: 404, headers });
  },
});

console.log(
  `🚀 BPL Playground server running at http://localhost:${server.port}`,
);
console.log(
  `📚 Examples available at http://localhost:${server.port}/examples`,
);
