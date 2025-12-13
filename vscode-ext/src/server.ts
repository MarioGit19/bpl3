import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentSyncKind,
  Location,
  Range,
  Hover,
  MarkupKind,
} from "vscode-languageserver/node";
import type {
  InitializeParams,
  TextDocumentPositionParams,
  InitializeResult,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      definitionProvider: true,
      hoverProvider: true,
      documentFormattingProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Promise<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.bplLanguageServer || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Promise<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "bplLanguageServer",
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

// Compiler integration
import { Parser } from "../../compiler/frontend/Parser";
import { TypeChecker } from "../../compiler/middleend/TypeChecker";
import { CompilerError } from "../../compiler/common/CompilerError";
import * as AST from "../../compiler/common/AST";
import { Formatter } from "../../compiler/formatter/Formatter";

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  const maxNumberOfProblems = settings?.maxNumberOfProblems || 1000;

  const text = textDocument.getText();
  const filePath = fileURLToPath(textDocument.uri);

  const diagnostics: Diagnostic[] = [];
  try {
    // Parse to AST
    const parser = new Parser(text, filePath);
    const program: AST.Program = parser.parse();

    // Type check (single-file scope; skip heavy import resolution)
    const checker = new TypeChecker({ skipImportResolution: true });
    // Validate and collect any semantic errors thrown during checking phases
    // Many type errors are thrown; wrap to capture
    try {
      // Assuming TypeChecker has an entry like checkProgram
      // If not, constructing will perform symbol definition; we need a pass:
      (checker as any).checkProgram
        ? (checker as any).checkProgram(program)
        : null;
    } catch (e: any) {
      if (e && e instanceof CompilerError) {
        diagnostics.push(compilerErrorToDiagnostic(e, textDocument));
      } else {
        // Unknown error: surface as generic diagnostic at top
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: Range.create(0, 0, 0, 1),
          message: String(e?.message || e),
          source: "bpl-lsp",
        });
      }
    }
  } catch (e: any) {
    if (e && e instanceof CompilerError) {
      diagnostics.push(compilerErrorToDiagnostic(e, textDocument));
    } else {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: Range.create(0, 0, 0, 1),
        message: String(e?.message || e),
        source: "bpl-lsp",
      });
    }
  }

  // Cap diagnostics if needed
  const limited = diagnostics.slice(0, maxNumberOfProblems);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: limited });
}

function compilerErrorToDiagnostic(
  err: CompilerError,
  doc: TextDocument,
): Diagnostic {
  const start = clampPosition(
    doc,
    err.location.startLine,
    err.location.startColumn,
  );
  const end = clampPosition(
    doc,
    err.location.endLine ?? err.location.startLine,
    err.location.endColumn ?? err.location.startColumn + 1,
  );
  return {
    severity: DiagnosticSeverity.Error,
    range: Range.create(start, end),
    message: `${err.message}${err.hint ? `\nHint: ${err.hint}` : ""}`,
    source: "bpl-lsp",
  };
}

function clampPosition(doc: TextDocument, line: number, character: number) {
  const text = doc.getText();
  const lines = text.split(/\r?\n/);
  const l = Math.max(0, Math.min(lines.length - 1, (line ?? 1) - 1));
  const maxChar = lines[l]?.length ?? 0;
  const c = Math.max(0, Math.min(maxChar, (character ?? 1) - 1));
  return { line: l, character: c };
}

// Formatting: full document only; no on-type formatting
connection.onDocumentFormatting(async (params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  const filePath = fileURLToPath(doc.uri);
  try {
    const parser = new Parser(text, filePath);
    const program: AST.Program = parser.parse();
    const formatter = new Formatter();
    const formatted = formatter.format(program);
    const fullRange = Range.create(0, 0, doc.lineCount, 0);
    return [
      {
        range: fullRange,
        newText: formatted,
      },
    ];
  } catch (e: any) {
    // If formatting fails, return no edits
    connection.console.error(`Formatting failed: ${e?.message || e}`);
    return [];
  }
});

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const keywords = [
      "global",
      "local",
      "const",
      "type",
      "frame",
      "ret",
      "struct",
      "import",
      "from",
      "export",
      "extern",
      "asm",
      "loop",
      "if",
      "else",
      "break",
      "continue",
      "try",
      "catch",
      "return",
      "throw",
      "switch",
      "case",
      "default",
      "cast",
      "sizeof",
      "match",
      "null",
      "nullptr",
      "true",
      "false",
      "new",
      "func",
      "class",
      "extends",
      "implements",
    ];
    const types = [
      "int",
      "uint",
      "float",
      "bool",
      "char",
      "void",
      "any",
      "Func",
      "string",
    ];

    const items: CompletionItem[] = [];

    keywords.forEach((kw, index) => {
      items.push({
        label: kw,
        kind: CompletionItemKind.Keyword,
        data: index,
      });
    });

    types.forEach((t, index) => {
      items.push({
        label: t,
        kind: CompletionItemKind.Class,
        data: keywords.length + index,
      });
    });

    return items;
  },
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (item.kind === CompletionItemKind.Keyword) {
    item.detail = "Keyword";
    item.documentation = `BPL keyword: ${item.label}`;
  } else if (item.kind === CompletionItemKind.Class) {
    item.detail = "Type";
    item.documentation = `BPL built-in type: ${item.label}`;
  }
  return item;
});

function findSymbolDefinition(
  document: TextDocument,
  word: string,
): { uri: string; range: Range; lineContent: string } | null {
  const text = document.getText();

  // 1. Search in current file
  const definitionRegex = new RegExp(
    `\\b(frame|struct|local|global|type|extern)\\s+${word}\\b`,
    "g",
  );
  let match = definitionRegex.exec(text);
  if (match) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);

    const matchType = match[1];
    let lineContent = "";
    const lines = text.split(/\r?\n/);
    let currentLineIdx = startPos.line;

    if (matchType === "struct" || matchType === "class") {
      let braceCount = 0;
      let foundStartBrace = false;
      let collectedLines: string[] = [];
      const maxLines = 50;

      for (let i = 0; i < maxLines; i++) {
        if (currentLineIdx + i >= lines.length) break;
        const lineStr = lines[currentLineIdx + i] ?? "";
        collectedLines.push(lineStr);

        for (const char of lineStr) {
          if (char === "{") {
            braceCount++;
            foundStartBrace = true;
          } else if (char === "}") {
            braceCount--;
          }
        }

        if (foundStartBrace && braceCount === 0) {
          break;
        }
      }
      lineContent = collectedLines.join("\n");
    } else if (matchType === "func" || matchType === "frame") {
      let collectedLines: string[] = [];
      const maxLines = 10;

      for (let i = 0; i < maxLines; i++) {
        if (currentLineIdx + i >= lines.length) break;
        let lineStr = lines[currentLineIdx + i] ?? "";

        const braceIdx = lineStr.indexOf("{");
        if (braceIdx !== -1) {
          lineStr = lineStr.substring(0, braceIdx);
          collectedLines.push(lineStr);
          break;
        } else {
          collectedLines.push(lineStr);
        }
      }
      lineContent = collectedLines.join("\n").trim();
    } else {
      lineContent = (lines[currentLineIdx] ?? "").trim();
    }

    return {
      uri: document.uri,
      range: Range.create(startPos, endPos),
      lineContent: lineContent,
    };
  }

  // 2. Search in imports
  const importRegex = /import\s+(.+?)\s+from\s+["'](.+?)["']/g;
  let impMatch;
  while ((impMatch = importRegex.exec(text)) !== null) {
    const importedSymbols = impMatch[1];
    const importPath = impMatch[2];

    if (importedSymbols && importedSymbols.includes(word)) {
      const currentDir = path.dirname(fileURLToPath(document.uri));
      let resolvedPath = path.resolve(currentDir, importPath || "");
      if (
        !fs.existsSync(resolvedPath) &&
        fs.existsSync(resolvedPath + ".bpl")
      ) {
        resolvedPath += ".bpl";
      }

      if (fs.existsSync(resolvedPath)) {
        const importedText = fs.readFileSync(resolvedPath, "utf-8");
        const importedDoc = TextDocument.create(
          pathToFileURL(resolvedPath).toString(),
          "bpl",
          1,
          importedText,
        );

        const defRegex = new RegExp(
          `\\b(frame|struct|local|global|type|func|class|extern)\\s+${word}\\b`,
          "g",
        );
        const defMatch = defRegex.exec(importedText);
        if (defMatch) {
          const startPos = importedDoc.positionAt(defMatch.index);
          const endPos = importedDoc.positionAt(
            defMatch.index + defMatch[0].length,
          );

          const matchType = defMatch[1];
          let lineContent = "";
          const lines = importedText.split(/\r?\n/);
          let currentLineIdx = startPos.line;

          if (matchType === "struct" || matchType === "class") {
            let braceCount = 0;
            let foundStartBrace = false;
            let collectedLines: string[] = [];
            const maxLines = 50;

            for (let i = 0; i < maxLines; i++) {
              if (currentLineIdx + i >= lines.length) break;
              const lineStr = lines[currentLineIdx + i] ?? "";
              collectedLines.push(lineStr);

              for (const char of lineStr) {
                if (char === "{") {
                  braceCount++;
                  foundStartBrace = true;
                } else if (char === "}") {
                  braceCount--;
                }
              }

              if (foundStartBrace && braceCount === 0) {
                break;
              }
            }
            lineContent = collectedLines.join("\n");
          } else if (matchType === "func" || matchType === "frame") {
            let collectedLines: string[] = [];
            const maxLines = 10;

            for (let i = 0; i < maxLines; i++) {
              if (currentLineIdx + i >= lines.length) break;
              let lineStr = lines[currentLineIdx + i] ?? "";

              const braceIdx = lineStr.indexOf("{");
              if (braceIdx !== -1) {
                lineStr = lineStr.substring(0, braceIdx);
                collectedLines.push(lineStr);
                break;
              } else {
                collectedLines.push(lineStr);
              }
            }
            lineContent = collectedLines.join("\n").trim();
          } else {
            lineContent = (lines[currentLineIdx] ?? "").trim();
          }

          return {
            uri: pathToFileURL(resolvedPath).toString(),
            range: Range.create(startPos, endPos),
            lineContent: lineContent,
          };
        }
      }
    }
  }
  return null;
}

connection.onDefinition(
  (params: TextDocumentPositionParams): Location | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }
    const text = document.getText();
    const offset = document.offsetAt(params.position);

    // Check if we are on an import string
    const lines = text.split("\n");
    const line = lines[params.position.line] ?? "";
    // Matches:
    // import A, [B] from "path"
    // import [A], [B] from "path"
    // import A from "path"
    const importMatch =
      /import\s+(?:(?:\w+|\[\s*\w+\s*\])(?:\s*,\s*(?:\w+|\[\s*\w+\s*\]))*\s+from\s+)["'](.+?)["']/.exec(
        line,
      );
    if (importMatch) {
      const importPath = importMatch[1];
      const startCol = line.indexOf(importPath || "");
      const endCol = startCol + (importPath?.length ?? 0);

      if (
        params.position.character >= startCol &&
        params.position.character <= endCol
      ) {
        // Resolve path
        const currentDir = path.dirname(fileURLToPath(document.uri));
        let resolvedPath = path.resolve(currentDir, importPath || "");

        // Try adding .bpl extension if missing
        if (
          !fs.existsSync(resolvedPath) &&
          fs.existsSync(resolvedPath + ".bpl")
        ) {
          resolvedPath += ".bpl";
        }

        if (fs.existsSync(resolvedPath)) {
          return Location.create(
            pathToFileURL(resolvedPath).toString(),
            Range.create(0, 0, 0, 0),
          );
        }
      }
    }

    // Simple word extraction
    const wordRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    let match;
    let word = "";
    while ((match = wordRegex.exec(text)) !== null) {
      if (offset >= match.index && offset <= match.index + match[0].length) {
        word = match[0];
        break;
      }
    }

    if (!word) {
      return null;
    }

    const def = findSymbolDefinition(document, word);
    if (def) {
      return Location.create(def.uri, def.range);
    }

    return null;
  },
);

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }
  const text = document.getText();
  const offset = document.offsetAt(params.position);

  const wordRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  let match;
  let foundMatch: RegExpExecArray | null = null;
  let word = "";
  while ((match = wordRegex.exec(text)) !== null) {
    if (offset >= match.index && offset <= match.index + match[0].length) {
      word = match[0];
      foundMatch = match;
      break;
    }
  }

  if (!word || !foundMatch) {
    return null;
  }

  const keywords = [
    "global",
    "local",
    "const",
    "type",
    "frame",
    "ret",
    "struct",
    "import",
    "from",
    "export",
    "extern",
    "asm",
    "loop",
    "if",
    "else",
    "break",
    "continue",
    "try",
    "catch",
    "return",
    "throw",
    "switch",
    "case",
    "default",
    "cast",
    "sizeof",
    "match",
    "null",
    "nullptr",
    "true",
    "false",
    "new",
    "func",
    "class",
    "extends",
    "implements",
  ];
  const types = [
    "int",
    "uint",
    "float",
    "bool",
    "char",
    "void",
    "any",
    "Func",
    "string",
  ];

  if (keywords.includes(word)) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**Keyword**: \`${word}\`\n\nStandard BPL keyword.`,
      },
    };
  }

  if (types.includes(word)) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**Type**: \`${word}\`\n\nBuilt-in BPL type.`,
      },
    };
  }

  const def = findSymbolDefinition(document, word);
  if (def) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: [
          "```bpl",
          def.lineContent,
          "```",
          `Defined in: \`${path.basename(fileURLToPath(def.uri))}\``,
        ].join("\n"),
      },
    };
  }

  // Check for property access (obj.prop)
  if (foundMatch.index > 0 && text[foundMatch.index - 1] === ".") {
    // Find the object name (scan backwards)
    let i = foundMatch.index - 2;
    while (i >= 0 && /[a-zA-Z0-9_]/.test(text[i] || "")) {
      i--;
    }
    const objName = text.substring(i + 1, foundMatch.index - 1);

    if (objName) {
      // 1. Find definition of the object
      const objDef = findSymbolDefinition(document, objName);
      if (objDef) {
        // 2. Extract type from definition
        // Matches: local name : Type, global name : Type, name : Type (in args)
        const typeMatch = /:\s*([a-zA-Z0-9_]+)/.exec(objDef.lineContent);
        if (typeMatch) {
          const typeName = typeMatch[1];

          // 3. Find definition of the type (struct)
          const structDef = findSymbolDefinition(document, typeName || "");
          if (structDef) {
            // 4. Find member in struct definition
            // Matches: member : Type
            const memberRegex = new RegExp(
              `\\b${word}\\s*:\\s*([a-zA-Z0-9_]+)`,
            );
            const memberMatch = memberRegex.exec(structDef.lineContent);

            if (memberMatch) {
              const memberType = memberMatch[1];
              return {
                contents: {
                  kind: MarkupKind.Markdown,
                  value: `(property) \`${typeName}.${word}\`: \`${memberType}\``,
                },
              };
            }
          }
        }
      }
    }
  }

  return null;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
