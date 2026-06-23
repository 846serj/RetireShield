import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function resolve(specifier, context, defaultResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.match(/\.[cm]?[jt]sx?$/)) {
    const base = new URL(specifier, context.parentURL);
    const tsUrl = `${base.href}.ts`;
    if (existsSync(fileURLToPath(tsUrl))) return { url: tsUrl, shortCircuit: true };
  }
  if (specifier.startsWith('@/')) {
    const tsPath = new URL(`../${specifier.slice(2)}.ts`, import.meta.url);
    const tsxPath = new URL(`../${specifier.slice(2)}.tsx`, import.meta.url);
    if (existsSync(fileURLToPath(tsPath))) return { url: pathToFileURL(fileURLToPath(tsPath)).href, shortCircuit: true };
    if (existsSync(fileURLToPath(tsxPath))) return { url: pathToFileURL(fileURLToPath(tsxPath)).href, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const source = await readFile(new URL(url), 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    });
    return { format: 'module', source: result.outputText, shortCircuit: true };
  }
  return defaultLoad(url, context, defaultLoad);
}
