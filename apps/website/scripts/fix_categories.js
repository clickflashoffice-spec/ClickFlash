const fs = require("fs");
const filePath = "E:/ClickFlash/apps/website/src/data/blogPosts.ts";
let content = fs.readFileSync(filePath, "utf8");
content = content.replace(/,\s*"Events and Attractions"/g, "");
fs.writeFileSync(filePath, content);
console.log("Categories updated!");
