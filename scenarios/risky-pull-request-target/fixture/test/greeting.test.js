import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeGreeting } from "../src/greeting.js";

test("greets users", () => {
  assert.equal(isSafeGreeting("maintainer"), "hello maintainer");
});
