const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");

// Chạy từ mọi thư mục: node frontend/check-antd-apis.cjs.
const root = __dirname;
const config = ts.readConfigFile(path.join(root, "tsconfig.app.json"), ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const findings = [];
let checked = 0;

function check(symbol, node, source) {
  if (!symbol) return;
  const declarations = symbol.getDeclarations() || [];
  if (!declarations.some((d) => /node_modules\/(antd|@rc-component)\//.test(d.getSourceFile().fileName))) return;
  const deprecated = symbol.getJsDocTags().find((tag) => tag.name === "deprecated");
  if (!deprecated) return;
  const { line } = source.getLineAndCharacterOfPosition(node.getStart());
  findings.push(`${path.relative(root, source.fileName)}:${line + 1} ${node.getText()} — ${ts.displayPartsToString(deprecated.text)}`);
}

for (const source of program.getSourceFiles()) {
  if (source.isDeclarationFile || source.fileName.includes("node_modules")) continue;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const props = checker.getContextualType(node.attributes);
      if (props) {
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue;
          checked++;
          check(props.getProperty(attr.name.getText()), attr.name, source);
        }
      }
    }
    if (ts.isPropertyAccessExpression(node)) {
      check(checker.getSymbolAtLocation(node.name), node, source);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
assert.ok(checked > 100, "Không đủ JSX được kiểm tra; kiểm tra lại cấu hình TypeScript.");
assert.deepEqual(findings, [], `Còn API Ant Design cũ:\n${findings.join("\n")}`);
console.log(`Đạt: kiểm tra ${checked} thuộc tính JSX, không còn API Ant Design cũ được đánh dấu trong typings.`);

// Chỉ kiểm tra cấu hình truyền xuống Select; không thay thế kiểm tra DOM/trình duyệt.
const fs = require("node:fs");
const vm = require("node:vm");
const file = path.join(root, "src/shared/ui/FloatingInput.tsx");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: (name) => {
    if (name === "antd") return { Select: "Select" };
    if (name === "react") return { useId: () => "input-test", useMemo: (fn) => fn() };
    return require(name);
  },
}, { filename: file });
function selectProps(props) {
  const tree = exportsObject.FloatingInput({ type: "select", ...props });
  function find(node) {
    if (!node || typeof node !== "object") return undefined;
    if (node.type === "Select") return node.props;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = find(child);
      if (found) return found;
    }
  }
  return find(tree);
}
assert.equal(selectProps({}).showSearch, undefined);
assert.equal(selectProps({ showSearch: false, mode: "multiple" }).showSearch, false);
for (const props of [{ showSearch: true }, { mode: "multiple" }, { mode: "tags" }]) {
  const search = selectProps(props).showSearch;
  assert.equal(search.filterOption("SKU", { label: "Cơ bida (sku 12)" }), true);
  assert.equal(search.filterOption("khác", { label: "Cơ bida" }), false);
  assert.equal(search.filterOption("x", {}), false);
}
const customFilter = () => false;
assert.equal(selectProps({ selectProps: { showSearch: { filterOption: customFilter } } }).showSearch.filterOption, customFilter);
assert.equal(selectProps({ showSearch: true, selectProps: { showSearch: false } }).showSearch, false);
assert.equal(selectProps({ mode: "multiple", selectProps: { mode: "tags" } }).mode, "tags");
console.log("Đạt: cấu hình tìm kiếm bật/tắt, multiple/tags, lọc label và quyền ưu tiên showSearch của caller.");
