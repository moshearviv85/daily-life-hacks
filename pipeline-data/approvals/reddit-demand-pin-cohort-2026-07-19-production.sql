WITH gate(ok) AS (
  SELECT
    (SELECT COUNT(*) FROM pins_schedule WHERE
      (row_id='playful-flour-hero' AND status='PENDING' AND scheduled_date='2026-07-20' AND COALESCE(scheduled_time,'00:00')='14:38') OR
      (row_id='playful-frozen-peas' AND status='PENDING' AND scheduled_date='2026-07-21' AND COALESCE(scheduled_time,'00:00')='14:33') OR
      (row_id='build-flavor-cinnamon-vanilla-citrus' AND status='PENDING' AND scheduled_date='2026-07-22' AND COALESCE(scheduled_time,'00:00')='14:37') OR
      (row_id='playful-milk-wins' AND status='PENDING' AND scheduled_date='2026-07-23' AND COALESCE(scheduled_time,'00:00')='14:48')
    ) = 4
    AND (SELECT COUNT(*) FROM pins_schedule WHERE row_id IN (
      'is-driving-to-cheaper-grocery-store-worth-it_v1',
      'one-theme-five-dinners-one-grocery-list_v1',
      'why-grocery-bill-went-up-after-cooking-more_v1',
      'grocery-unit-price-calculator_v1'
    )) = 0
), incoming(row_id,pin_title,pin_description,alt_text,image_url,board_id,link,scheduled_date,scheduled_time,status) AS (VALUES
('is-driving-to-cheaper-grocery-store-worth-it_v1','Is Driving to a Cheaper Grocery Store Worth It?','A cheaper store only wins when the basket savings beat gas, parking, transit, and the extra time. Run your own numbers with the free grocery-trip calculator.','Grocery bags, a road map, car keys, and a calculator with the question Is Driving to a Cheaper Grocery Store Worth It?','https://www.daily-life-hacks.com/images/pins/is-driving-to-cheaper-grocery-store-worth-it_v1.jpg','1124140825679184036','https://www.daily-life-hacks.com/cheaper-grocery-store-drive-worth-it/','2026-07-20','14:38','PENDING'),
('one-theme-five-dinners-one-grocery-list_v1','Could One Grocery List Cover Five Dinners?','Five unrelated recipes create a grocery list with commitment issues. This taco-inspired theme week shares beans, corn, cabbage, lime, tortillas, and salsa across five different dinners.','Five dinners made with shared beans, corn, tortillas, cabbage, peppers, and lime with the question Could One Grocery List Cover Five Dinners?','https://www.daily-life-hacks.com/images/pins/one-theme-five-dinners-one-grocery-list_v1.jpg','1124140825679184034','https://www.daily-life-hacks.com/one-grocery-list-five-dinners/','2026-07-21','14:33','PENDING'),
('why-grocery-bill-went-up-after-cooking-more_v1','Why Did My Grocery Bill Go Up After I Started Cooking?','Groceries can rise while total food spending falls. Add takeout, delivery, work lunches, coffee, and groceries before deciding whether cooking at home costs more.','Grocery bags balanced against fewer takeout boxes with the question Why Did My Grocery Bill Go Up After I Started Cooking?','https://www.daily-life-hacks.com/images/pins/why-grocery-bill-went-up-after-cooking-more_v1.jpg','1124140825679184036','https://www.daily-life-hacks.com/grocery-bill-up-cooking-at-home/','2026-07-22','14:37','PENDING'),
('grocery-unit-price-calculator_v1','Is the Bigger Package Actually Cheaper?','The value-size package doesn''t automatically have the lower unit price. Compare two packages by ounce, pound, volume, or count before the shelf tag gets away with it.','Two different sizes of oat containers beside a calculator and magnifying glass with the question Is the Bigger Package Actually Cheaper?','https://www.daily-life-hacks.com/images/pins/grocery-unit-price-calculator_v1.jpg','1124140825679184036','https://www.daily-life-hacks.com/bigger-package-unit-price-check/','2026-07-23','14:48','PENDING')
), source AS (
  SELECT p.row_id,p.pin_title,p.pin_description,p.alt_text,p.image_url,p.board_id,p.link,p.scheduled_date,p.scheduled_time,'REVIEW',p.pin_id,p.published_date,p.pinterest_response,p.fail_count,p.created_at,datetime('now')
  FROM pins_schedule p CROSS JOIN gate g
  WHERE g.ok=1 AND p.row_id IN (
    'playful-flour-hero',
    'playful-frozen-peas',
    'build-flavor-cinnamon-vanilla-citrus',
    'playful-milk-wins'
  )
  UNION ALL
  SELECT i.row_id,i.pin_title,i.pin_description,i.alt_text,i.image_url,i.board_id,i.link,i.scheduled_date,i.scheduled_time,i.status,NULL,NULL,NULL,0,datetime('now'),datetime('now')
  FROM incoming i CROSS JOIN gate g WHERE g.ok=1
)
INSERT INTO pins_schedule(row_id,pin_title,pin_description,alt_text,image_url,board_id,link,scheduled_date,scheduled_time,status,pin_id,published_date,pinterest_response,fail_count,created_at,updated_at)
SELECT * FROM source WHERE 1
ON CONFLICT(row_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at;
