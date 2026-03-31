#pragma once

#include <QString>
#include <QColor>

namespace ClickFlash {

class Theme {
public:
    static Theme& instance() {
        static Theme instance;
        return instance;
    }

    void loadDarkTheme() {
        m_background = "#1a1a2e";
        m_surface = "#16213e";
        m_primary = "#0f3460";
        m_accent = "#e94560";
        m_text = "#ffffff";
        m_textSecondary = "#a0a0a0";
        m_border = "#2a2a4e";
        m_success = "#00c853";
        m_warning = "#ff9800";
        m_error = "#f44336";
    }

    void loadLightTheme() {
        m_background = "#ffffff";
        m_surface = "#f5f5f5";
        m_primary = "#2196f3";
        m_accent = "#e91e63";
        m_text = "#212121";
        m_textSecondary = "#757575";
        m_border = "#e0e0e0";
        m_success = "#4caf50";
        m_warning = "#ff9800";
        m_error = "#f44336";
    }

    QString background() const { return m_background; }
    QString surface() const { return m_surface; }
    QString primary() const { return m_primary; }
    QString accent() const { return m_accent; }
    QString text() const { return m_text; }
    QString textSecondary() const { return m_textSecondary; }
    QString border() const { return m_border; }
    QString success() const { return m_success; }
    QString warning() const { return m_warning; }
    QString error() const { return m_error; }

    QString stylesheet() const {
        return QString(R"(
            QMainWindow {
                background-color: %1;
            }
            QWidget {
                background-color: %1;
                color: %2;
            }
            QPushButton {
                background-color: %3;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
            }
            QPushButton:hover {
                background-color: %4;
            }
            QLineEdit, QTextEdit {
                background-color: %5;
                color: %2;
                border: 1px solid %6;
                padding: 6px;
                border-radius: 4px;
            }
            QLabel {
                color: %2;
            }
        )").arg(m_background, m_text, m_primary, m_accent, m_surface, m_border);
    }

private:
    Theme() { loadDarkTheme(); }
    ~Theme() = default;

    QString m_background;
    QString m_surface;
    QString m_primary;
    QString m_accent;
    QString m_text;
    QString m_textSecondary;
    QString m_border;
    QString m_success;
    QString m_warning;
    QString m_error;
};

} // namespace ClickFlash
