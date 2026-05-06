#include "ui/albums/Filmstrip.h"
#include "core/Logger.h"

#include <QFile>
#include <QPainter>
#include <QMouseEvent>
#include <QDebug>

namespace ClickFlash {

Filmstrip::Filmstrip(QWidget* parent)
    : QWidget(parent)
    , m_currentIndex(0)
    , m_selectionMode(false)
{
    setMinimumHeight(100);
    setMaximumHeight(150);
    
    QVBoxLayout* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    
    // Toolbar
    QWidget* toolbar = new QWidget(this);
    QHBoxLayout* toolbarLayout = new QHBoxLayout(toolbar);
    toolbarLayout->setContentsMargins(5, 2, 5, 2);
    
    QLabel* label = new QLabel("Filmstrip", this);
    toolbarLayout->addWidget(label);
    
    QPushButton* selectAllBtn = new QPushButton("Select All", this);
    QPushButton* deselectAllBtn = new QPushButton("Deselect", this);
    QPushButton* invertBtn = new QPushButton("Invert", this);
    
    connect(selectAllBtn, &QPushButton::clicked, this, &Filmstrip::selectAll);
    connect(deselectAllBtn, &QPushButton::clicked, this, &Filmstrip::deselectAll);
    connect(invertBtn, &QPushButton::clicked, this, &Filmstrip::invertSelection);
    
    toolbarLayout->addStretch();
    toolbarLayout->addWidget(selectAllBtn);
    toolbarLayout->addWidget(deselectAllBtn);
    toolbarLayout->addWidget(invertBtn);
    
    mainLayout->addWidget(toolbar);
    
    // Scroll area with thumbnails
    m_scrollArea = new QScrollArea(this);
    m_scrollArea->setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    m_scrollArea->setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    m_scrollArea->setWidgetResizable(true);
    m_scrollArea->setStyleSheet("border: none; background: #1a1a2e;");
    
    m_thumbnailsContainer = new QWidget(m_scrollArea);
    m_thumbnailLayout = new QHBoxLayout(m_thumbnailsContainer);
    m_thumbnailLayout->setContentsMargins(5, 5, 5, 5);
    m_thumbnailLayout->setSpacing(5);
    
    m_scrollArea->setWidget(m_thumbnailsContainer);
    mainLayout->addWidget(m_scrollArea);
}

void Filmstrip::addThumbnail(const QString& photoId, const QString& thumbnailPath) {
    m_photoIds.append(photoId);
    m_selectionStates.append(false);
    
    QLabel* thumbnail = new QLabel(m_thumbnailsContainer);
    thumbnail->setFixedSize(80, 60);
    thumbnail->setStyleSheet("border: 2px solid transparent; background: #2a2a3e;");
    thumbnail->setScaledContents(true);
    thumbnail->setCursor(Qt::PointingHandCursor);
    
    // Load thumbnail image
    if (!thumbnailPath.isEmpty() && QFile::exists(thumbnailPath)) {
        QPixmap pixmap(thumbnailPath);
        if (!pixmap.isNull()) {
            thumbnail->setPixmap(pixmap);
        }
    } else {
        thumbnail->setText("No Preview");
        thumbnail->setAlignment(Qt::AlignCenter);
    }
    
    // Store index for click handling
    thumbnail->setProperty("index", m_thumbnailsLabels.size());
    thumbnail->installEventFilter(this);
    
    m_thumbnailLabels.append(thumbnail);
    m_thumbnailLayout->addWidget(thumbnail);
    
    updateSelection();
}

void Filmstrip::clearThumbnails() {
    for (QLabel* label : m_thumbnailLabels) {
        m_thumbnailLayout->removeWidget(label);
        delete label;
    }
    
    m_photoIds.clear();
    m_thumbnailLabels.clear();
    m_selectionStates.clear();
    m_currentIndex = 0;
}

void Filmstrip::setCurrentIndex(int index) {
    if (index < 0 || index >= m_thumbnailLabels.size()) return;
    
    m_currentIndex = index;
    
    // Update visual selection
    for (int i = 0; i < m_thumbnailLabels.size(); ++i) {
        if (i == index) {
            m_thumbnailLabels[i]->setStyleSheet("border: 2px solid #e94560; background: #2a2a3e;");
        } else {
            m_thumbnailLabels[i]->setStyleSheet("border: 2px solid transparent; background: #2a2a3e;");
        }
    }
    
    // Scroll to visible
    m_thumbnailLabels[index]->ensureVisible();
    
    emit currentChanged(index);
}

void Filmstrip::updateSelection() {
    for (int i = 0; i < m_thumbnailLabels.size(); ++i) {
        QString style = "border: 2px solid ";
        
        if (i == m_currentIndex) {
            style += "#e94560;"; // Current index - red border
        } else if (m_selectionStates[i]) {
            style += "#4ecca3;"; // Selected - green border
        } else {
            style += "transparent;";
        }
        
        style += " background: #2a2a3e;";
        m_thumbnailLabels[i]->setStyleSheet(style);
    }
}

void Filmstrip::selectAll() {
    m_selectionMode = true;
    for (int i = 0; i < m_selectionStates.size(); ++i) {
        m_selectionStates[i] = true;
    }
    updateSelection();
    
    QList<int> selected;
    for (int i = 0; i < m_selectionStates.size(); ++i) {
        if (m_selectionStates[i]) selected.append(i);
    }
    emit selectionChanged(selected);
}

void Filmstrip::deselectAll() {
    m_selectionMode = false;
    for (int i = 0; i < m_selectionStates.size(); ++i) {
        m_selectionStates[i] = false;
    }
    updateSelection();
    emit selectionChanged(QList<int>());
}

void Filmstrip::invertSelection() {
    m_selectionMode = true;
    for (int i = 0; i < m_selectionStates.size(); ++i) {
        m_selectionStates[i] = !m_selectionStates[i];
    }
    updateSelection();
    
    QList<int> selected;
    for (int i = 0; i < m_selectionStates.size(); ++i) {
        if (m_selectionStates[i]) selected.append(i);
    }
    emit selectionChanged(selected);
}

bool Filmstrip::eventFilter(QObject* obj, QEvent* event) {
    if (event->type() == QEvent::MouseButtonPress) {
        QLabel* thumbnail = qobject_cast<QLabel*>(obj);
        if (thumbnail) {
            int index = thumbnail->property("index").toInt();
            
            if (QMouseEvent* mouseEvent = static_cast<QMouseEvent*>(event)) {
                if (mouseEvent->modifiers() & Qt::ControlModifier) {
                    // Toggle selection
                    m_selectionMode = true;
                    m_selectionStates[index] = !m_selectionStates[index];
                    updateSelection();
                    
                    QList<int> selected;
                    for (int i = 0; i < m_selectionStates.size(); ++i) {
                        if (m_selectionStates[i]) selected.append(i);
                    }
                    emit selectionChanged(selected);
                } else {
                    // Set as current
                    setCurrentIndex(index);
                    emit thumbnailClicked(index);
                }
            }
            return true;
        }
    }
    return QWidget::eventFilter(obj, event);
}

} // namespace ClickFlash