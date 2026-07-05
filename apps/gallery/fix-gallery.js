const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

const dir = 'C:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/components/albums';

// useCropTool.ts
replaceInFile(dir + '/hooks/useCropTool.ts', [
    ["@/types.ts", "../../types"],
    ["@/utils/logger.ts", "../../utils/logger"]
]);

// useKioskSync.ts
replaceInFile(dir + '/hooks/useKioskSync.ts', [
    ["@/types.ts", "../../types"],
    ["@/services/apiService.ts", "../../services/apiService"],
    ["@/services/webSocketService.ts", "../../services/webSocketService"],
    ["@/services/pb.ts", "../../services/pb"],
    ["@/utils/logger.ts", "../../utils/logger"],
    ["../../../services/webSocketService", "../../services/webSocketService"],
    [".map(p =>", ".map((p: any) =>"],
    [".find(p =>", ".find((p: any) =>"],
    [".filter(p =>", ".filter((p: any) =>"],
    [".some(p =>", ".some((p: any) =>"]
]);

// usePhotoEdits.ts
replaceInFile(dir + '/hooks/usePhotoEdits.ts', [
    ["@/types.ts", "../../types"]
]);

// PhotoViewerPanel.tsx
replaceInFile(dir + '/PhotoViewerPanel.tsx', [
    ["@/components/common/Spinner.tsx", "../common/Spinner"],
    ["@/types.ts", "../../types"],
    ["@/utils/logger.ts", "../../utils/logger"]
]);
