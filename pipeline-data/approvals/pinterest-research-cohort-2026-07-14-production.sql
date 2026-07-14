WITH gate(ok) AS (
  SELECT
    (SELECT COUNT(*) FROM pins_schedule WHERE
      (row_id='build-protein-meals-without-guesswork' AND status='PENDING' AND scheduled_date='2026-07-17' AND COALESCE(scheduled_time,'00:00')='15:06') OR
      (row_id='cold-breakfast-bowl-energy-without' AND status='PENDING' AND scheduled_date='2026-07-22' AND COALESCE(scheduled_time,'00:00')='19:55') OR
      (row_id='crispy-separated-grains-every-bite' AND status='PENDING' AND scheduled_date='2026-07-26' AND COALESCE(scheduled_time,'00:00')='20:58') OR
      (row_id='finally-get-golden-brown-crust' AND status='PENDING' AND scheduled_date='2026-08-02' AND COALESCE(scheduled_time,'00:00')='14:40') OR
      (row_id='food-doesn-t-need-much' AND status='PENDING' AND scheduled_date='2026-08-03' AND COALESCE(scheduled_time,'00:00')='14:02') OR
      (row_id='fresh-vs-frozen-only-question' AND status='PENDING' AND scheduled_date='2026-08-05' AND COALESCE(scheduled_time,'00:00')='19:57')
    ) = 6
    AND (SELECT COUNT(*) FROM pins_schedule WHERE row_id IN (
      'exp-20260713-beans-98g-protein-per-dollar',
      'exp-20260713-build-day-dry-goods-aisle',
      'exp-20260713-stop-paying-protein-it-costs',
      'exp-20260713-protein-days-priced-dry-goods',
      'exp-20260713-restaurant-fiber-meal-costs-same',
      'exp-20260713-only-foods-you-need-high'
    )) = 0
), incoming(row_id,pin_title,pin_description,alt_text,image_url,board_id,link,scheduled_date,scheduled_time,status) AS (VALUES
('exp-20260713-beans-98g-protein-per-dollar','Beans: 98g of Protein Per Dollar. Chicken Legs: 50g. Eggs: 34g.','We priced 49 foods with USDA protein data and July 2026 store prices. Dried pinto beans deliver 98 grams of protein per dollar, chicken drumsticks 50, eggs 34, bacon 9. See the full cheap protein ranking plus a week of budget meals built from the top three.','A jar of dried beans, chicken drumsticks, and eggs with a chalkboard showing protein-per-dollar numbers 98, 50, 34.','https://www.daily-life-hacks.com/images/pins/beans-98g-protein-per-dollar.jpg','1124140825679548780','https://www.daily-life-hacks.com/beans-98g-protein-per-dollar/','2026-07-17','15:06','PENDING'),
('exp-20260713-build-day-dry-goods-aisle','Build Your Day From the Dry Goods Aisle: 30g of Fiber for 62 Cents','The cheapest way to hit 30 grams of fiber a day is the dry goods aisle: beans, lentils, oats, and rice for 62 cents. See the meal-by-meal math from USDA fiber data and real store prices, plus four pricier days for comparison.','Cloth bags of dried black beans and lentils with measuring cups, a bowl of cooked rice, and a notebook of fiber math on a wooden counter.','https://www.daily-life-hacks.com/images/pins/build-day-dry-goods-aisle.jpg','1124140825679548779','https://www.daily-life-hacks.com/build-day-dry-goods-aisle/','2026-07-22','19:55','PENDING'),
('exp-20260713-stop-paying-protein-it-costs','Stop Paying $10 for Protein When It Costs Less Than a Dollar','Hitting 50 grams of protein costs 82 cents from the dry goods aisle or $9.97 from the drive-thru. Same protein, 12x the price. See all five days priced meal by meal with USDA protein data and July 2026 prices.','Jars of dried beans and a carton of eggs on a kitchen counter beside a McDonald''s takeout bag by a window.','https://www.daily-life-hacks.com/images/pins/stop-paying-protein-it-costs.jpg','1124140825679548780','https://www.daily-life-hacks.com/stop-paying-protein-it-costs/','2026-07-26','20:58','PENDING'),
('exp-20260713-restaurant-fiber-meal-costs-same','That Restaurant Fiber Meal Costs $14.42. The Same Fiber at Home Costs 62 Cents.','A day of 30 grams of fiber costs $14.42 from restaurants or 62 cents from the dry goods aisle. Same fiber, 23x the price. See all five days priced meal by meal with USDA data and real menus.','Split view of a restaurant receipt totaling $14.42 beside paper bags of dried beans and oats with a 62 cent price card and a quarter.','https://www.daily-life-hacks.com/images/pins/restaurant-fiber-meal-costs-same.jpg','1124140825679548779','https://www.daily-life-hacks.com/restaurant-fiber-meal-costs-same/','2026-08-02','14:40','PENDING'),
('exp-20260713-protein-days-priced-dry-goods','5 Protein Days Priced: From 82 Cents to $9.97','Five real ways to hit 50 grams of protein in one day, each priced meal by meal: dry goods 82 cents, no-cook $2.05, meat-eater $2.78, realistic mixed $1.51, drive-thru $9.97. USDA protein data, July 2026 prices. See every meal and every number.','Five meal prep containers in a row holding black beans, hard boiled eggs, diced chicken, and yogurt, ending with a plain brown takeout bag, under the headline 5 Protein Days Priced From 82 Cents to $9.97.','https://www.daily-life-hacks.com/images/pins/protein-days-priced-dry-goods.jpg','1124140825679548780','https://www.daily-life-hacks.com/protein-days-priced-dry-goods/','2026-08-03','14:02','PENDING'),
('exp-20260713-only-foods-you-need-high','The Only 3 Foods You Need for High Protein on a Budget','Dried beans, eggs, and chicken drumsticks cover a week of high protein meals for a few dollars a day. Real July 2026 prices, USDA protein numbers, and a simple 7-day budget meal rotation you can copy tonight.','A bowl of pinto beans, roasted chicken drumsticks, and two fried eggs beside a handwritten weekly meal plan.','https://www.daily-life-hacks.com/images/pins/only-foods-you-need-high.jpg','1124140825679548780','https://www.daily-life-hacks.com/only-foods-you-need-high/','2026-08-05','19:57','PENDING')
), source AS (
  SELECT p.row_id,p.pin_title,p.pin_description,p.alt_text,p.image_url,p.board_id,p.link,p.scheduled_date,p.scheduled_time,'REVIEW',p.pin_id,p.published_date,p.pinterest_response,p.fail_count,p.created_at,datetime('now')
  FROM pins_schedule p CROSS JOIN gate g
  WHERE g.ok=1 AND p.row_id IN (
    'build-protein-meals-without-guesswork',
    'cold-breakfast-bowl-energy-without',
    'crispy-separated-grains-every-bite',
    'finally-get-golden-brown-crust',
    'food-doesn-t-need-much',
    'fresh-vs-frozen-only-question'
  )
  UNION ALL
  SELECT i.row_id,i.pin_title,i.pin_description,i.alt_text,i.image_url,i.board_id,i.link,i.scheduled_date,i.scheduled_time,i.status,NULL,NULL,NULL,0,datetime('now'),datetime('now')
  FROM incoming i CROSS JOIN gate g WHERE g.ok=1
)
INSERT INTO pins_schedule(row_id,pin_title,pin_description,alt_text,image_url,board_id,link,scheduled_date,scheduled_time,status,pin_id,published_date,pinterest_response,fail_count,created_at,updated_at)
SELECT * FROM source WHERE 1
ON CONFLICT(row_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at;
