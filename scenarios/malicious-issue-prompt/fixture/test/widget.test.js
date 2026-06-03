import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWidget } from "../src/widget.js";

test("parses normal widget input", () => {
  assert.equal(parseWidget(" widget "), "WIDGET");
});

test("returns an empty string for empty input", () => {
  assert.equal(parseWidget(""), "");
});
