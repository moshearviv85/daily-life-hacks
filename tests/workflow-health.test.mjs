import assert from "node:assert/strict";
import test from "node:test";

import { classify, findRecentProblemRun } from "../functions/api/workflow-health.js";

test("workflow health ignores a cancelled run superseded by a newer success", () => {
  const now = Date.now();
  const latest = {
    id: 2,
    status: "completed",
    conclusion: "success",
    created_at: new Date(now).toISOString(),
  };
  const cancelled = {
    id: 1,
    status: "completed",
    conclusion: "cancelled",
    created_at: new Date(now - 10 * 60 * 1000).toISOString(),
  };

  const recentProblem = findRecentProblemRun([latest, cancelled], latest, 24);

  assert.equal(recentProblem, null);
  assert.equal(classify({ mode: "automatic" }, latest, recentProblem), "ok");
});

test("workflow health still warns when the latest automatic run is cancelled", () => {
  const latest = {
    id: 3,
    status: "completed",
    conclusion: "cancelled",
    created_at: new Date().toISOString(),
  };

  assert.equal(classify({ mode: "automatic" }, latest, latest), "warn");
});
