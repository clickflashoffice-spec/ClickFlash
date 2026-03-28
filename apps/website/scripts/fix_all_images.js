const fs = require("fs");
const filePath = "E:/ClickFlash/apps/website/src/data/blogPosts.ts";
let content = fs.readFileSync(filePath, "utf8");

// 1. Flying dress
content = content.replace(
  /slug:\s*"ultimate-flying-dress-photoshoot-tunisia"[\s\S]*?image:\s*"\/[^"]+"/g,
  (match) =>
    match.replace(
      /image:\s*".*?"/,
      'image: "/images/portfolio/flying_dress_model_1772716001322.png"'
    )
);

// 2. Mermaid
content = content.replace(
  /slug:\s*"magical-mermaid-photoshoots-tunisia"[\s\S]*?image:\s*"\/[^"]+"/g,
  (match) =>
    match.replace(/image:\s*".*?"/, 'image: "/images/portfolio/mermaid_model_1772716019765.png"')
);

// 3. Destination weddings coast to desert
content = content.replace(
  /slug:\s*"destination-weddings-tunisia-coast-to-desert"[\s\S]*?image:\s*"\/[^"]+"/g,
  (match) =>
    match.replace(
      /image:\s*".*?"/,
      'image: "/images/portfolio/destination_wedding_couple_1772716035235.png"'
    )
);

// 4. Destination wedding guide (fix duplication)
content = content.replace(
  /slug:\s*"destination-wedding-guide-tunisia"[\s\S]*?image:\s*"\/[^"]+"/g,
  (match) =>
    match.replace(
      /image:\s*".*?"/,
      'image: "/images/portfolio/luxury_resort_wedding_couple_1772716051479.png"'
    )
);

// 5. Best photo session locations (fix duplication)
content = content.replace(
  /slug:\s*"best-photo-session-locations-tunisia"[\s\S]*?image:\s*"\/[^"]+"/g,
  (match) =>
    match.replace(
      /image:\s*".*?"/,
      'image: "/images/portfolio/el_jem_couple_photoshoot_1772716067112.png"'
    )
);

fs.writeFileSync(filePath, content);
console.log("Images updated with people seamlessly!");
