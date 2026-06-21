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

test("pin board routing sends general recipes to the easy dinner board", () => {
  const board = boardForPin({
    title: "Sheet Pan Chicken Dinner",
    description: "A simple weeknight recipe with vegetables and rice.",
    article_slug: "sheet-pan-chicken-dinner",
  }, "recipes");

  assert.equal(board.id, "1124140825679548778");
  assert.equal(board.name, "Easy Dinner Recipes");
});

test("pin board routing sends meal prep topics to the meal prep kitchen board", () => {
  const board = boardForPin({
    title: "Bulk Meal Prep for Easy Lunches",
    description: "A practical kitchen system for easier make-ahead meals.",
    article_slug: "bulk-meal-prep-easy-lunches",
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

test("pin board routing sends budget topics to the grocery board", () => {
  const board = boardForPin({
    title: "Budget Meals from a Small Grocery List",
    description: "Affordable pantry dinners that help save money.",
    article_slug: "budget-meals-small-grocery-list",
  }, "tips");

  assert.equal(board.id, "1124140825679548779");
  assert.equal(board.name, "Budget Meals and Grocery Hacks");
});

test("pin board routing sends storage topics to the freezer board", () => {
  const board = boardForPin({
    title: "Freeze Flat for Easy Food Storage",
    description: "A practical leftover system that protects shelf life.",
    article_slug: "freeze-flat-food-storage",
  }, "tips");

  assert.equal(board.id, "1124140825679548781");
  assert.equal(board.name, "Food Storage and Freezer Tips");
});

test("pin board routing sends protein topics to the protein board", () => {
  const board = boardForPin({
    title: "High Protein Lunch Ideas Without Powder",
    description: "Food-first protein meals with eggs, tofu, and yogurt.",
    article_slug: "high-protein-lunch-ideas-without-powder",
  }, "nutrition");

  assert.equal(board.id, "1124140825679548780");
  assert.equal(board.name, "High Protein Meals and Smart Swaps");
});

test("board aliases resolve to the same Pinterest board id", () => {
  assert.equal(boardIdForName("Healthy Breakfast, Smoothies and Snacks"), "1124140825679184036");
  assert.equal(boardIdForName("Healthy Meal Prep & Kitchen Tips"), "1124140825679184036");
  assert.equal(boardIdForName("gut-health-nutrition-tips"), "1124140825679184034");
  assert.equal(boardIdForName("Budget Meals"), "1124140825679548779");
  assert.equal(boardIdForName("Freezer Tips"), "1124140825679548781");
  assert.equal(boardForCategory("tips").id, "1124140825679184036");
});
