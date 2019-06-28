"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = silent => {
  if (silent) {
    return () => {};
  }

  return (level, ...args) => console[level](...args);
};

exports.default = _default;