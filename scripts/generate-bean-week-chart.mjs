import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { beanWeekChartSvg } from "../src/lib/bean-week-chart.js";

const target = join(process.cwd(), "public/images/how-many-pounds-of-dried-beans-for-a-week-chart.jpg");
const jpeg = await sharp(Buffer.from(beanWeekChartSvg())).jpeg({ quality: 91 }).toBuffer();
writeFileSync(target, jpeg);
console.log(target, jpeg.length);
