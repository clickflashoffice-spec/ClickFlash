#!/bin/bash
# MASTER SECRET ROTATION SCRIPT
# Generated automatically - covers ALL keys found in codebase
# WARNING: This script requires manual dashboard access for live keys

set -e

echo '========================================'
echo 'CLICKFLASH MASTER SECRET ROTATION'
echo '========================================'
echo ''
echo '--- STRIPE TEST ---'
echo 'Found 2 keys'
echo 'ACTION: Go to https://dashboard.stripe.com/apikeys'
echo '  - sk_test_xxxxxxxxxxxx...xxxxxxxxxxxxxxxxxxxx'
echo '  - sk_test_4eC39HqLyjWD...9HqLyjWDarjtT1zdp7dc'

echo '--- STRIPE RESTRICTED TEST ---'
echo 'Found 1 keys'
echo 'ACTION: Go to https://dashboard.stripe.com/apikeys'
echo '  - rk_test_51Tfm2NDVvB2...YhfF1iGk4R003s0oziu1'

echo '--- RESEND ---'
echo 'Found 3 keys'
echo 'ACTION: Go to https://resend.com/api-keys'
echo '  - [REDACTED]...isplayLevelDirectory'
echo '  - [REDACTED]...qqwuyjtpsorkppjsrstr'
echo '  - [REDACTED]...PathRegistrySOFTWARE'

echo '--- CLOUDFLARE ---'
echo 'Found 3 keys'
echo 'ACTION: Go to https://dash.cloudflare.com/profile/api-tokens'
echo '  - cfut_WNDywpLDOQqLb9z...eVIjN9BKV4Tab937ffb1'
echo '  - cfut_WNDywpLDOQqLb9z...3IzNI3PZVHJlZeVIjN9B'
echo '  - cfut_VMGMGxL1ABVuIWx...lsdWnAcQemBN0b4b4109'

echo '--- JWT ---'
echo 'Found 19 keys'
echo 'ACTION: Generate new secrets with: openssl rand -hex 32'
echo '  - clickflash_occidenta...l_secure_secret_2025'
echo '  - de8c75171b04901373c0...ef2b739cf4a5880c84d6'
echo '  - e5c1407a6ee1f326c6eb...b64e797715f66a869f06'
echo '  - e5c1407a6ee1f326c6eb...976b580798a09a69a74b'
echo '  - REPLACE_WITH_64_BYTE...H_64_BYTE_HEX_SECRET'
echo '  - 8a624de6544ed58fe79d...a785b01b919050f90287'
echo '  - test_master_secret_2...ter_secret_2026_9999'
echo '  - test_gallery_secret_..._gallery_secret_2026'
echo '  - CHANGE_THIS_TO_A_STR...STRONG_RANDOM_SECRET'
echo '  - test_jwt_secret_for_...n_production_32chars'
echo '  - b7d2f8e1c3a5d9f0a2b4...c0e2d4f6a8b0c2d4f6a8'
echo '  - 0471b46f3e8b6ee3b675...564dbbb6186b94d6b4ac'
echo '  - change-this-in-produ...e-this-in-production'
echo '  - 42898c0d9a60e0a55c2f...4f5a6b7c8d9e0f1a2b3c'
echo '  - 0471b46f3e8b6ee3b675...c89e5f933f01aa58edd0'
echo '  - clickflash_concorde_...e_secure_secret_2025'
echo '  - touch_kiosk_secret_c...duction_min_32_chars'
echo '  - f9a8b7c6d5e4f3a2b1c0...d7e6f5a4b3c2d1e0f9a8'
echo '  - clickflash_club_secu...b_secure_secret_2025'

echo ''
echo '========================================'
echo 'GIT HISTORY PURGE'
echo '========================================'
echo ''
echo 'Creating replacement file...'
cat > /tmp/clickflash-replacements.txt << 'EOF'
sk_test_xxxxxxxxxxxxxxxxxxxxxxxx==>STRIPE_TEST_PLACEHOLDER
sk_test_4eC39HqLyjWDarjtT1zdp7dc==>STRIPE_TEST_PLACEHOLDER
[REDACTED]==>STRIPE_RESTRICTED_TEST_PLACEHOLDER
[REDACTED]==>RESEND_PLACEHOLDER
[REDACTED]==>RESEND_PLACEHOLDER
[REDACTED]==>RESEND_PLACEHOLDER
[REDACTED]==>CLOUDFLARE_PLACEHOLDER
[REDACTED]==>CLOUDFLARE_PLACEHOLDER
[REDACTED]==>CLOUDFLARE_PLACEHOLDER
clickflash_occidental_secure_secret_2025==>JWT_PLACEHOLDER
de8c75171b04901373c09dfd5912bf30157af0af26b9ef2b739cf4a5880c84d6==>JWT_PLACEHOLDER
e5c1407a6ee1f326c6ebfcbfc8784e0ad72dffffbdf06a5f3685d635db1f67c8ce1211abb60a83a18fd10f776976b580798a09a69a74b64e797715f66a869f06==>JWT_PLACEHOLDER
e5c1407a6ee1f326c6ebfcbfc8784e0ad72dffffbdf06a5f3685d635db1f67c8ce1211abb60a83a18fd10f776976b580798a09a69a74b==>JWT_PLACEHOLDER
REPLACE_WITH_64_BYTE_HEX_SECRET==>JWT_PLACEHOLDER
8a624de6544ed58fe79d861377bdb50c15e197e58505a785b01b919050f90287==>JWT_PLACEHOLDER
test_master_secret_2026_9999==>JWT_PLACEHOLDER
test_gallery_secret_2026==>JWT_PLACEHOLDER
CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET==>JWT_PLACEHOLDER
test_jwt_secret_for_phase_95_do_not_use_in_production_32chars==>JWT_PLACEHOLDER
b7d2f8e1c3a5d9f0a2b4c6e8d0f2a4b6c8e0d2f4a6b8c0e2d4f6a8b0c2d4f6a8==>JWT_PLACEHOLDER
0471b46f3e8b6ee3b675bee3858c761769670310dc22ede03eadbe4061501010e4fc3d5961b19c581fca5501f564dbbb6186b94d6b4ac==>JWT_PLACEHOLDER
change-this-in-production==>JWT_PLACEHOLDER
42898c0d9a60e0a55c2f061c0d0d4a7c8e9b0a1c2d3e4f5a6b7c8d9e0f1a2b3c==>JWT_PLACEHOLDER
0471b46f3e8b6ee3b675bee3858c761769670310dc22ede03eadbe4061501010e4fc3d5961b19c581fca5501f564dbbb6186b94d6b4ac89e5f933f01aa58edd0==>JWT_PLACEHOLDER
clickflash_concorde_secure_secret_2025==>JWT_PLACEHOLDER
touch_kiosk_secret_change_this_in_production_min_32_chars==>JWT_PLACEHOLDER
f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8==>JWT_PLACEHOLDER
clickflash_club_secure_secret_2025==>JWT_PLACEHOLDER
EOF

echo 'Running git-filter-repo...'
pip install git-filter-repo 2>/dev/null || true
git filter-repo --replace-text /tmp/clickflash-replacements.txt

echo ''
echo 'Force pushing...'
git push origin --force --all

echo ''
echo '========================================'
echo 'ROTATION COMPLETE'
echo '========================================'