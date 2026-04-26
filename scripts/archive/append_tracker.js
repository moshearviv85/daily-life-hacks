import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const trackerPath = path.join(__dirname, '..', 'pipeline-data', 'content-tracker.json');

const newArticles = [
    {
        "id": 141,
        "category": "tips",
        "keyword": "batch cooking for beginners weekly guide",
        "pin_title": "Batch Cooking for Beginners Weekly Guide",
        "description": "Exhausted by weeknight cooking? Master the Sunday system with this ridiculously straightforward batch cooking for beginners weekly guide.",
        "hashtags": ["MealPrep", "BatchCooking", "TimeSavingTips", "HealthyKitchen", "BeginnerCooking"],
        "alt_text": "Batch Cooking for Beginners Weekly Guide - multiple glass containers filled with pre-cooked grains, roasted vegetables, and proteins aligned on a counter",
        "slug": "batch-cooking-for-beginners-weekly-guide",
        "status": "IDEATED",
        "date_created": "",
        "draft_path": null,
        "validated_path": null,
        "image_web": null,
        "image_pins": [],
        "published": false,
        "deployed": false,
        "qc_notes": ""
    },
    {
        "id": 142,
        "category": "tips",
        "keyword": "how to make grocery shopping cheaper",
        "pin_title": "How to Make Grocery Shopping Cheaper",
        "description": "Inflation making the checkout line painful? Learn how to make grocery shopping cheaper with these incredibly effective, psychology-based strategies.",
        "hashtags": ["BudgetTips", "GroceryShopping", "MoneySavingTips", "HealthyHacks", "KitchenTips"],
        "alt_text": "How to Make Grocery Shopping Cheaper - a person calculating a total on a smartphone while sitting in a grocery cart aisle",
        "slug": "how-to-make-grocery-shopping-cheaper",
        "status": "IDEATED",
        "date_created": "",
        "draft_path": null,
        "validated_path": null,
        "image_web": null,
        "image_pins": [],
        "published": false,
        "deployed": false,
        "qc_notes": ""
    },
    {
        "id": 143,
        "category": "tips",
        "keyword": "how to store fruits and vegetables properly",
        "pin_title": "How to Store Fruits and Vegetables Properly",
        "description": "Stop letting your produce rot. Discover how to store fruits and vegetables properly to double their lifespan and completely eliminate food waste.",
        "hashtags": ["FoodStorage", "KitchenHacks", "ZeroWaste", "HealthyKitchen", "MoneySavingTips"],
        "alt_text": "How to Store Fruits and Vegetables Properly - fresh produce perfectly organized in clear bins inside a clean refrigerator",
        "slug": "how-to-store-fruits-and-vegetables-properly",
        "status": "IDEATED",
        "date_created": "",
        "draft_path": null,
        "validated_path": null,
        "image_web": null,
        "image_pins": [],
        "published": false,
        "deployed": false,
        "qc_notes": ""
    }
];

const data = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
data.push(...newArticles);
fs.writeFileSync(trackerPath, JSON.stringify(data, null, 2), 'utf-8');
console.log("Appended 3 missing articles to content-tracker.json");
