const fs = require("fs");
const filePath = "E:/ClickFlash/apps/website/src/data/blogPosts.ts";
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
  /slug:\s*"destination-wedding-guide-tunisia"[\s\S]*?image:\s*"\/[^"]+"/g,
  (match) =>
    match.replace(
      /image:\s*".*?"/,
      'image: "/images/portfolio/destination_wedding_tunisia_setup_1772715871943.png"'
    )
);

content = content.replace(
  /slug:\s*"best-photo-session-locations-tunisia"[\s\S]*?image:\s*"\/[^"]+"/g,
  (match) =>
    match.replace(
      /image:\s*".*?"/,
      'image: "/images/portfolio/el_jem_photo_location_1772715889646.png"'
    )
);

fs.writeFileSync(filePath, content);
console.log("Duplicate images replaced successfully!");
