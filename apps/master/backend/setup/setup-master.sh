#!/bin/bash

# ClickFlash Master Station - One-Command Setup
# Usage: ./setup-master.sh [DESK_ID] [DESK_NAME] [LOCATION]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$BACKEND_DIR")"

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: ./setup-master.sh <DESK_ID> [DESK_NAME] [LOCATION]"
    echo ""
    echo "Examples:"
    echo "  ./setup-master.sh MASTER_MALDIVES_01"
    echo "  ./setup-master.sh MASTER_MALDIVES_01 'Soneva Fushi' 'Maldives'"
    exit 1
fi

DESK_ID="$1"
DESK_NAME="${2:-Master Station ${DESK_ID}}"
LOCATION="${3:-Unknown Location}"

log_info "Starting setup for Master Station: ${DESK_ID}"
log_info "Name: ${DESK_NAME}"
log_info "Location: ${LOCATION}"

# Step 1: Check prerequisites
log_info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
log_success "Node.js $(node -v) found"

# Check if running in correct directory
if [ ! -f "${BACKEND_DIR}/server.ts" ] && [ ! -f "${BACKEND_DIR}/server.js" ]; then
    log_error "Please run this script from the Master backend directory"
    exit 1
fi

# Step 2: Create necessary directories
log_info "Creating directories..."
mkdir -p "${PROJECT_DIR}/pb_data/uploads"
mkdir -p "${PROJECT_DIR}/pb_data/trash_archive"
mkdir -p "${PROJECT_DIR}/logs"
mkdir -p "${PROJECT_DIR}/backup"
log_success "Directories created"

# Step 3: Install dependencies
log_info "Installing dependencies..."
cd "${BACKEND_DIR}"
if [ -f "package.json" ]; then
    npm install
    log_success "Dependencies installed"
else
    log_warn "No package.json found, skipping npm install"
fi

# Step 4: Check for existing configuration
ENV_FILE="${PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
    log_warn "Existing .env file found"
    read -p "Do you want to backup and create new configuration? (yes/no): " RESET_CONFIG
    if [ "$RESET_CONFIG" = "yes" ]; then
        cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backup created"
    else
        log_info "Keeping existing configuration"
    fi
else
    # Create .env from template
    if [ -f "${SCRIPT_DIR}/config-template.env" ]; then
        cp "${SCRIPT_DIR}/config-template.env" "$ENV_FILE"
        log_success "Created .env from template"
    fi
fi

# Step 5: Run setup wizard if node script exists
SETUP_JS="${SCRIPT_DIR}/cloud-setup-wizard.js"
if [ -f "$SETUP_JS" ]; then
    log_info "Running setup wizard..."
    
    # Check if we should run interactive or automated
    if [ -n "$CLOUD_API_URL" ] && [ -n "$CLOUD_EMAIL" ] && [ -n "$CLOUD_PASSWORD" ]; then
        log_info "Using automated setup with environment variables"
        # Automated mode would go here - for now, always interactive
        node "$SETUP_JS"
    else
        log_info "Starting interactive setup wizard..."
        log_info "Please answer the following questions:"
        echo ""
        node "$SETUP_JS"
    fi
else
    log_warn "Setup wizard not found, manual configuration required"
    
    # Manual configuration prompts
    echo ""
    echo "=== Manual Configuration ==="
    echo ""
    
    read -p "Management Hub URL (e.g., https://management.clickflash.app): " HUB_URL
    read -p "Admin Email: " ADMIN_EMAIL
    read -s -p "Admin Password: " ADMIN_PASS
    echo ""
    read -p "Gallery URL (e.g., https://gallery.clickflash.app): " GALLERY_URL
    
    # Update .env file
    cat >> "$ENV_FILE" << EOF

# Auto-generated configuration
DESK_ID=${DESK_ID}
DESK_NAME=${DESK_NAME}
DESK_LOCATION=${LOCATION}
CLOUD_API_URL=${HUB_URL}
CLOUD_EMAIL=${ADMIN_EMAIL}
CLOUD_PASSWORD=${ADMIN_PASS}
GALLERY_URL=${GALLERY_URL}
GALLERY_ENABLED=true
CLOUD_SYNC_ENABLED=true
MONEYTRASH_ENABLED=true
RETENTION_DAYS=15
EOF
    
    log_success "Configuration saved to .env"
fi

# Step 6: Run database migrations
log_info "Running database migrations..."
if [ -d "${BACKEND_DIR}/shared/migrations" ]; then
    # Check for SQLite
    if command -v sqlite3 &> /dev/null; then
        DB_FILE="${PROJECT_DIR}/pb_data/data.db"
        mkdir -p "$(dirname "$DB_FILE")"
        
        # Run all migration files
        for migration in "${BACKEND_DIR}/shared/migrations"/*.sql; do
            if [ -f "$migration" ]; then
                log_info "Applying migration: $(basename "$migration")"
                sqlite3 "$DB_FILE" < "$migration" || log_warn "Migration may have already been applied"
            fi
        done
        
        # Run numbered migrations
        for migration in "${BACKEND_DIR}/migrations"/*.sql; do
            if [ -f "$migration" ]; then
                log_info "Applying migration: $(basename "$migration")"
                sqlite3 "$DB_FILE" < "$migration" || log_warn "Migration may have already been applied"
            fi
        done
        
        log_success "Database migrations completed"
    else
        log_warn "SQLite3 not found. Migrations will run on first application start."
    fi
else
    log_warn "No migrations directory found"
fi

# Step 7: Create systemd service (optional)
if command -v systemctl &> /dev/null; then
    read -p "Create systemd service for auto-start? (yes/no): " CREATE_SERVICE
    if [ "$CREATE_SERVICE" = "yes" ]; then
        SERVICE_FILE="/etc/systemd/system/clickflash-${DESK_ID}.service"
        
        sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=ClickFlash Master Station ${DESK_ID}
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=${BACKEND_DIR}
Environment=NODE_ENV=production
Environment=DESK_ID=${DESK_ID}
ExecStart=/usr/bin/node ${BACKEND_DIR}/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        log_success "Systemd service created: clickflash-${DESK_ID}"
        log_info "Start with: sudo systemctl start clickflash-${DESK_ID}"
        log_info "Enable auto-start: sudo systemctl enable clickflash-${DESK_ID}"
    fi
fi

# Step 8: Create startup script
STARTUP_SCRIPT="${PROJECT_DIR}/start-master.sh"
cat > "$STARTUP_SCRIPT" <<'EOF'
#!/bin/bash
# Start ClickFlash Master Station

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

# Load environment
export $(cat ../.env | grep -v '^#' | xargs)

# Start server
echo "Starting ClickFlash Master: $DESK_ID"
npm start
EOF
chmod +x "$STARTUP_SCRIPT"
log_success "Startup script created: start-master.sh"

# Step 9: Final checks
log_info "Running final checks..."

# Check if .env is properly configured
if [ -f "$ENV_FILE" ]; then
    if grep -q "DESK_ID=" "$ENV_FILE" && grep -q "CLOUD_API_URL=" "$ENV_FILE"; then
        log_success "Configuration file validated"
    else
        log_warn "Configuration file may be incomplete"
    fi
fi

# Create setup completion marker
echo "${DESK_ID}" > "${PROJECT_DIR}/.setup-complete"

# Print summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                SETUP COMPLETED SUCCESSFULLY!                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Master Station: ${DESK_ID}"
echo "Name: ${DESK_NAME}"
echo "Location: ${LOCATION}"
echo ""
echo "Next Steps:"
echo "  1. Review configuration: cat .env"
echo "  2. Start application: ./start-master.sh"
echo "  3. Or use: npm start"
echo "  4. Access application: http://localhost:8090"
echo ""
echo "Cloud Sync:"
echo "  - Management Hub: Will connect automatically"
echo "  - Gallery: Will connect automatically"
echo "  - First sync may take a few minutes"
echo ""
echo "For help, see: MASTER_SETUP_GUIDE.md"
echo ""
log_success "Setup complete! 🎉"
