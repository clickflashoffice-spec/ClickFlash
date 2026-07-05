const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/alamo/Desktop/ClickFlash/apps/management/src/components';

function replaceInFile(relativePath, replacements) {
    const filePath = path.join(dir, relativePath);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${relativePath}`);
}

replaceInFile('Clients.tsx', [
    [/_style/g, 'style'],
    [/className="flex border-b/g, 'style={style} className="flex border-b']
]);
replaceInFile('common/OfflineScreen.tsx', [
    [/_onBack/g, 'onBack']
]);
replaceInFile('dashboard/MasterOverview.tsx', [
    [/_stats/g, 'stats']
]);
replaceInFile('dashboard/ResortDashboard.tsx', [
    [/_currentUser/g, 'currentUser'],
    [/_totalMeetingsTaken/g, 'totalMeetingsTaken']
]);
replaceInFile('dashboard/widgets/RevenueByDestinationWidget.tsx', [
    [/_timeFilter/g, 'timeFilter']
]);
replaceInFile('Login.tsx', [
    [/_portalName/g, 'portalName']
]);
replaceInFile('management/analytics/MoneyTrashMarketing.tsx', [
    [/_currentUser/g, 'currentUser']
]);
replaceInFile('management/DocumentationPage.tsx', [
    [/_currentUser/g, 'currentUser']
]);
replaceInFile('management/FleetMonitorPage.tsx', [
    [/_onNavigateToStation/g, 'onNavigateToStation']
]);
replaceInFile('management/OperationalCommandCenter.tsx', [
    [/_currentUser/g, 'currentUser']
]);
replaceInFile('management/PerformancePage.tsx', [
    [/_formatCurrency/g, 'formatCurrency']
]);
replaceInFile('management/reports/HotelReportView.tsx', [
    [/_photographers/g, 'photographers']
]);
replaceInFile('management/settings/SessionTypesSettings.tsx', [
    [/_context/g, 'context']
]);
replaceInFile('management/TriageDashboard.tsx', [
    [/_context/g, 'context']
]);
replaceInFile('photographers/WorkingTimeModal.tsx', [
    // This is "Expected 1-2 arguments, but got 3." Let's check what this is manually, 
    // but I'll skip it in the automated script.
]);
replaceInFile('ProductsPage.tsx', [
    [/_context/g, 'context']
]);
