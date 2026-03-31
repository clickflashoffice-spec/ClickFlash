#include "ui/bookings/BookingsView.h"
#include "database/DatabaseManager.h"
#include "core/Logger.h"

namespace ClickFlash {

BookingsView::BookingsView(QWidget* parent)
    : View(parent)
{
    setupHeader("Bookings", true);
    refresh();
}

BookingsView::~BookingsView() {}

void BookingsView::refresh() {
    loadBookings();
}

void BookingsView::loadBookings() {
    try {
        DatabaseManager& db = DatabaseManager::instance();
        
        auto bookings = db.executeQueryMultiple(
            "SELECT id, customer_name, session_type, scheduled_at, status FROM bookings ORDER BY scheduled_at ASC"
        );
        
        CF_DEBUG("Loaded {} bookings", bookings.size());
        
    } catch (const std::exception& e) {
        CF_ERROR("Failed to load bookings: {}", e.what());
    }
}

} // namespace ClickFlash
