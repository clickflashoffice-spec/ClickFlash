#include "ui/photographers/PhotographersView.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

namespace ClickFlash {

PhotographersView::PhotographersView(QWidget* parent)
    : View(parent)
{
    setupHeader("Photographers", true);
    refresh();
}

PhotographersView::~PhotographersView() {}

void PhotographersView::refresh() {
    loadPhotographers();
}

void PhotographersView::loadPhotographers() {
    try {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto photographers = db.executeQueryMultiple(
            "SELECT id, name, email, role FROM users WHERE role = 'Photographer'"
        );
        
        CF_DEBUG("Loaded {} photographers", photographers.size());
        
    } catch (const std::exception& e) {
        CF_ERROR("Failed to load photographers: {}", e.what());
    }
}

} // namespace ClickFlash
