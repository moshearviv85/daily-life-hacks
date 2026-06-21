import assert from "node:assert/strict";
import test from "node:test";

import { boardForCategory, boardForPin, boardIdForName } from "../functions/api/_pin-metadata.js";

test("pin board routing keeps recipe pins on the high fiber recipe board", () => {
  const board = boardForPin({
    title: "Easy bean dinner recipe",
    description: "A simple weeknight dinner with pantry beans.",
    article_slug: "easy-bean-dinner-recipe",
  }, "recipes");

  assert.equal(board.id, "1124140825679184032");
  assert.equal(board.name, "High Fiber Dinner and Gut Health Recipes");
});

test("pin board routing sends tips and prep topics to the meal prep kitchen board", () => {
  const board = boardForPin({
    title: "Bulk Meal Prep: Freeze Flat for Easy Storage",
    description: "A practical kitchen system for easier freezer meals.",
    article_slug: "bulk-meal-prep-freeze-flat-storage",
  }, "tips");

  assert.equal(board.id, "1124140825679184036");
  assert.equal(board.name, "Healthy Meal Prep & Kitchen Tips");
});

test("pin board routing keeps nutrition topics on the gut health board", () => {
  const board = boardForPin({
    title: "How to Read Nutrition Labels Without Overthinking It",
    description: "A practical guide to label basics, fiber, and sodium.",
    article_slug: "how-to-read-nutrition-labels",
  }, "nutrition");

  assert.equal(board.id, "1124140825679184034");
  assert.equal(board.name, "Gut Health Tips and Nutrition Charts");
});

test("board aliases resolve to the same Pinterest board id", () => {
  assert.equal(boardIdForName("Healthy Breakfast, Smoothies and Snacks"), "1124140825679184036");
  assert.equal(boardIdForName("Healthy Meal Prep & Kitchen Tips"), "1124140825679184036");
  assert.equal(boardIdForName("gut-health-nutrition-tips"), "1124140825679184034");
  assert.equal(boardForCategory("tips").id, "1124140825679184036");
});
