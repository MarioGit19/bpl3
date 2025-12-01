import { serve } from "bun";
import { join, resolve } from "path";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { spawnSync } from "child_process";

const PORT = 3000;
const PUBLIC_DIR = resolve(import.meta.dir, "public");
const ROOT_DIR = resolve(import.meta.dir, "..");

console.log(`Starting Playground Server on http://localhost:${PORT}`);

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API: Run Code
    if (url.pathname === "/api/run" && req.method === "POST") {
      try {
        const { code } = await req.json();
        const tempFile = join(ROOT_DIR, "playground_temp.x");

        writeFileSync(tempFile, code);

        // Run the transpiler
        // We use the LLVM backend and run mode (-r)
        // We also capture stdout/stderr
        const proc = spawnSync(
          "bun",
          ["index.ts", "--llvm", "-q", "-r", "playground_temp.x"],
          {
            cwd: ROOT_DIR,
            encoding: "utf-8",
          },
        );

        // Cleanup
        if (existsSync(tempFile)) unlinkSync(tempFile);
        const tempLlvm = join(ROOT_DIR, "playground_temp.ll");
        if (existsSync(tempLlvm)) unlinkSync(tempLlvm);
        const tempExe = join(ROOT_DIR, "playground_temp");
        if (existsSync(tempExe)) unlinkSync(tempExe);

        return Response.json({
          stdout: proc.stdout,
          stderr: proc.stderr,
          exitCode: proc.status,
        });
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500 });
      }
    }

    // API: Compile Code (Get IR and ASM)
    if (url.pathname === "/api/compile" && req.method === "POST") {
      try {
        const { code } = await req.json();
        const tempFile = join(ROOT_DIR, "playground_temp.x");

        writeFileSync(tempFile, code);

        // 1. Get LLVM IR
        const procLlvm = spawnSync(
          "bun",
          ["index.ts", "--llvm", "-q", "-p", "playground_temp.x"],
          {
            cwd: ROOT_DIR,
            encoding: "utf-8",
          },
        );

        // 2. Get Assembly (x86)
        const procAsm = spawnSync(
          "bun",
          ["index.ts", "-q", "-p", "playground_temp.x"],
          {
            cwd: ROOT_DIR,
            encoding: "utf-8",
          },
        );

        // Cleanup
        if (existsSync(tempFile)) unlinkSync(tempFile);
        const tempLlvm = join(ROOT_DIR, "playground_temp.ll");
        if (existsSync(tempLlvm)) unlinkSync(tempLlvm);
        const tempAsm = join(ROOT_DIR, "playground_temp.asm");
        if (existsSync(tempAsm)) unlinkSync(tempAsm);

        return Response.json({
          llvm: procLlvm.stdout,
          asm: procAsm.stdout,
          stderr: procLlvm.stderr + "\n" + procAsm.stderr,
          exitCode: procLlvm.status || procAsm.status,
        });
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500 });
      }
    }

    // Static Files
    let filePath = join(
      PUBLIC_DIR,
      url.pathname === "/" ? "index.html" : url.pathname,
    );

    // Security check to prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});
