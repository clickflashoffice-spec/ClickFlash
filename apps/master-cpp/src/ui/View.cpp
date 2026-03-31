#include "ui/View.h"

namespace ClickFlash {

View::View(QWidget* parent)
    : QWidget(parent)
    , mainLayout(new QVBoxLayout(this))
    , titleLabel(new QLabel(this))
    , contentWidget(new QWidget(this))
    , headerFrame(new QFrame(this))
{
    setupUi();
}

View::~View() {}

void View::setupUi() {
    setStyleSheet(R"(
        QWidget {
            background-color: #1a1a2e;
        }
        QLabel {
            color: #ffffff;
        }
        QFrame#header {
            background-color: #16213e;
            border-radius: 8px;
            padding: 16px;
        }
        QPushButton {
            background-color: #e94560;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
        }
        QPushButton:hover {
            background-color: #d63850;
        }
        QPushButton#secondary {
            background-color: #0f3460;
        }
        QPushButton#secondary:hover {
            background-color: #1a4a80;
        }
    )");
    
    mainLayout->setContentsMargins(24, 24, 24, 24);
    mainLayout->setSpacing(16);
    
    setLayout(mainLayout);
}

void View::setupHeader(const QString& title, bool showRefresh) {
    QHBoxLayout* headerLayout = new QHBoxLayout();
    headerLayout->setContentsMargins(16, 16, 16, 16);
    
    titleLabel->setText(title);
    titleLabel->setStyleSheet("font-size: 24px; font-weight: bold; color: #ffffff;");
    
    headerLayout->addWidget(titleLabel);
    headerLayout->addStretch();
    
    if (showRefresh) {
        QPushButton* refreshBtn = new QPushButton("↻ Refresh");
        refreshBtn->setObjectName("secondary");
        connect(refreshBtn, &QPushButton::clicked, this, &View::refresh);
        headerLayout->addWidget(refreshBtn);
    }
    
    headerFrame->setLayout(headerLayout);
    headerFrame->setObjectName("header");
    
    mainLayout->addWidget(headerFrame);
}

void View::addSection(const QString& title, QWidget* widget) {
    if (!title.isEmpty()) {
        QLabel* sectionTitle = new QLabel(title);
        sectionTitle->setStyleSheet("font-size: 16px; font-weight: bold; color: #a0a0a0; padding-top: 16px;");
        mainLayout->addWidget(sectionTitle);
    }
    mainLayout->addWidget(widget);
}

QPushButton* View::addActionButton(const QString& text) {
    QPushButton* btn = new QPushButton(text);
    return btn;
}

void View::applyCardStyle(QFrame* frame) {
    frame->setStyleSheet(R"(
        QFrame {
            background-color: #16213e;
            border-radius: 8px;
            padding: 16px;
        }
    )");
}

} // namespace ClickFlash
