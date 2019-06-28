"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateGenericExportInterface = exports.generateNamedExports = exports.filenameToTypingsFilename = exports.filterReservedWordClasses = exports.filterNonWordClasses = void 0;

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const filenameToInterfaceName = filename => {
  return _path.default.basename(filename).replace(/^(\w)/, (_, c) => 'I' + c.toUpperCase()).replace(/\W+(\w)/g, (_, c) => c.toUpperCase());
};

const cssModuleToTypescriptInterfaceProperties = (cssModuleKeys, indent = '  ') => {
  return cssModuleKeys.map(key => `${indent}'${key}': string;`).join('\n');
};

const cssModuleToNamedExports = cssModuleKeys => {
  return cssModuleKeys.map(key => `export const ${key}: string;`).join('\n');
};

const allWordsRegexp = /^\w+$/i;

const filterNonWordClasses = cssModuleKeys => {
  const filteredClassNames = cssModuleKeys.filter(classname => allWordsRegexp.test(classname));

  if (filteredClassNames.length === cssModuleKeys.length) {
    return [filteredClassNames, []];
  }

  const nonWordClassNames = cssModuleKeys.filter(classname => !allWordsRegexp.test(classname));
  return [filteredClassNames, nonWordClassNames];
}; // Documented here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Reserved_keywords_as_of_ECMAScript_2015


exports.filterNonWordClasses = filterNonWordClasses;
const reservedWords = ['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'];

const filterReservedWordClasses = cssModuleKeys => {
  const filteredClassNames = cssModuleKeys.filter(classname => reservedWords.indexOf(classname) === -1);

  if (filteredClassNames.length === cssModuleKeys.length) {
    return [filteredClassNames, []];
  }

  const reservedWordClassNames = cssModuleKeys.filter(classname => reservedWords.indexOf(classname) !== -1);
  return [filteredClassNames, reservedWordClassNames];
};

exports.filterReservedWordClasses = filterReservedWordClasses;

const filenameToTypingsFilename = filename => {
  const dirName = _path.default.dirname(filename);

  const baseName = _path.default.basename(filename);

  return _path.default.join(dirName, `${baseName}.d.ts`);
};

exports.filenameToTypingsFilename = filenameToTypingsFilename;

const generateNamedExports = cssModuleKeys => {
  const namedExports = cssModuleToNamedExports(cssModuleKeys);
  return `${namedExports}
`;
};

exports.generateNamedExports = generateNamedExports;

const generateGenericExportInterface = (cssModuleKeys, filename, indent) => {
  const interfaceName = filenameToInterfaceName(filename);
  const interfaceProperties = cssModuleToTypescriptInterfaceProperties(cssModuleKeys, indent);
  return `export interface ${interfaceName} {
${interfaceProperties}
}

export const locals: ${interfaceName};
export default locals;
`;
};

exports.generateGenericExportInterface = generateGenericExportInterface;