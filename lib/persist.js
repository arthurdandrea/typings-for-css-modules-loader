"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.writeToFileIfChanged = void 0;

var _gracefulFs = _interopRequireDefault(require("graceful-fs"));

var _os = _interopRequireDefault(require("os"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const writeToFileIfChanged = (filename, content) => {
  if (_gracefulFs.default.existsSync(filename)) {
    const currentInput = _gracefulFs.default.readFileSync(filename, 'utf-8');

    if (currentInput !== content) {
      writeFile(filename, content);
    }
  } else {
    writeFile(filename, content);
  }
};

exports.writeToFileIfChanged = writeToFileIfChanged;

const writeFile = (filename, content) => {
  //Replace new lines with OS-specific new lines
  content = content.replace(/\n/g, _os.default.EOL);

  _gracefulFs.default.writeFileSync(filename, content, 'utf8');
};