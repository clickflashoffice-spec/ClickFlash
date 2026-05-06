const fs = require('fs');
const path = require('path');

const SKILLS_DIR = 'e:\\ClickFlash\\.agent\\skills';
const VALID_FILES = ['SKILL.md', 'package.json', 'README.md'];

function parseFrontmatter(content) {
    const match = content.match(/^---\s*([\s\S]*?)\s*---/);
    if (!match) return null;
    const frontmatter = {};
    match[1].split('\n').forEach(line => {
        const [key, ...value] = line.split(':');
        if (key && value) {
            frontmatter[key.trim()] = value.join(':').trim();
        }
    });
    return frontmatter;
}

function auditSkills() {
    if (!fs.existsSync(SKILLS_DIR)) {
        console.error(`Skills directory not found: ${SKILLS_DIR}`);
        return;
    }

    const items = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    const report = {
        totalDirectories: 0,
        validSkills: 0,
        invalidSkills: [],
        anomalies: []
    };

    items.forEach(item => {
        if (!item.isDirectory()) return;
        report.totalDirectories++;

        const skillPath = path.join(SKILLS_DIR, item.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        if (!fs.existsSync(skillMdPath)) {
            report.invalidSkills.push({ name: item.name, reason: 'Missing SKILL.md' });
            return;
        }

        try {
            const content = fs.readFileSync(skillMdPath, 'utf8');
            const frontmatter = parseFrontmatter(content);

            if (!frontmatter || !frontmatter.name) {
                report.invalidSkills.push({ name: item.name, reason: 'Invalid or missing frontmatter' });
            } else {
                report.validSkills++;
            }
        } catch (e) {
            report.anomalies.push({ name: item.name, error: e.message });
        }
    });

    console.log(JSON.stringify(report, null, 2));
}

auditSkills();
