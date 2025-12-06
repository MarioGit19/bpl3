import { CodeJar } from "https://medv.io/codejar/codejar.js";

const editorElement = document.getElementById("codeEditor");
const outputPre = document.getElementById("consoleOutput");
const irPre = document.getElementById("irOutput");
const astPre = document.getElementById("astOutput");
const tutorialList = document.getElementById("tutorialList");
const tutTitle = document.getElementById("tutTitle");
const tutDesc = document.getElementById("tutDesc");
const warnPre = document.getElementById("warnOutput");

const highlight = (editor) => {
  // Highlight with Prism
  if (window.Prism) {
    editor.innerHTML = Prism.highlight(
      editor.textContent,
      Prism.languages.c,
      "c",
    );
  }
};

const jar = CodeJar(editorElement, highlight);

// Load tutorials
fetch("/tutorials.json")
  .then((res) => res.json())
  .then((data) => {
    data.tutorials.forEach((tut, index) => {
      const li = document.createElement("li");
      li.textContent = tut.title;
      li.onclick = () => loadTutorial(tut, li);
      tutorialList.appendChild(li);
      if (index === 0) loadTutorial(tut, li);
    });
  });

function loadTutorial(tut, li) {
  document
    .querySelectorAll("#tutorialList li")
    .forEach((el) => el.classList.remove("active"));
  li.classList.add("active");
  tutTitle.textContent = tut.title;
  tutDesc.textContent = tut.description;
  jar.updateCode(tut.code);
}

// Run Code
document.getElementById("runBtn").addEventListener("click", async () => {
  outputPre.textContent = "Running...";
  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: jar.toString() }),
    });
    const data = await res.json();

    if (data.error) {
      outputPre.textContent = "Server Error:\n" + data.error;
      warnPre.textContent = "";
    } else {
      let output = "";
      if (data.stdout) output += data.stdout;
      if (data.exitCode !== 0) output += "\nExited with code: " + data.exitCode;
      outputPre.textContent = output || "No output";

      // Parse warnings from stderr
      const warnings = parseWarnings(data.stderr || "");
      warnPre.textContent = warnings || "No warnings";
      document.querySelector("button[data-target='warnings']").innerText =
        `Warnings` + (warnings ? ` (${warnings.split("\n").length})` : "");
    }
    // Switch to output tab
    document.querySelector('.tab[data-target="output"]').click();
  } catch (e) {
    outputPre.textContent = "Network Error: " + e.message;
  }
});

// Compile Code
document.getElementById("compileBtn").addEventListener("click", async () => {
  irPre.textContent = "Compiling...";
  try {
    const res = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: jar.toString() }),
    });
    const data = await res.json();

    if (data.error) {
      irPre.textContent = "Server Error:\n" + data.error;
      warnPre.textContent = "";
    } else {
      irPre.textContent = data.llvm || "No LLVM IR output";
      // Parse warnings from stderr
      const warnings = parseWarnings(data.stderr || "");
      warnPre.textContent = warnings || "No warnings";
      document.querySelector("button[data-target='warnings']").innerText =
        `Warnings` + (warnings ? ` (${warnings.split("\n").length})` : "");
    }
    // Switch to IR tab
    document.querySelector('.tab[data-target="ir"]').click();
  } catch (e) {
    irPre.textContent = "Network Error: " + e.message;
  }
});

// Show AST
document.getElementById("astBtn").addEventListener("click", async () => {
  astPre.textContent = "Generating AST...";
  try {
    const res = await fetch("/api/ast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: jar.toString() }),
    });
    const data = await res.json();

    if (data.error) {
      astPre.textContent = "Server Error:\n" + data.error;
    } else {
      astPre.textContent = data.ast || "No AST output";
    }
    // Switch to AST tab
    document.querySelector('.tab[data-target="ast"]').click();
  } catch (e) {
    astPre.textContent = "Network Error: " + e.message;
  }
});

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

function parseWarnings(stderr) {
  if (!stderr || !stderr.trim()) return "";
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim().replaceAll(/\x1b\[[\d]+m/g, ""));
  const warnLines = lines; //.filter((l) => l.startsWith("Warning:"));
  return warnLines.join("\n");
}
