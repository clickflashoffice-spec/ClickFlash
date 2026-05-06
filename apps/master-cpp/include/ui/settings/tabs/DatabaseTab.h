#pragma once

#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>
#include <QFormLayout>
#include <QLineEdit>
#include <QComboBox>
#include <QProgressBar>
#include <QTextEdit>

namespace ClickFlash {

class DatabaseTab : public QWidget {
    Q_OBJECT

public:
    explicit DatabaseTab(QWidget* parent = nullptr);

private slots:
    void backupDatabase();
    void restoreDatabase();
    void vacuumDatabase();
    void exportSchema();

private:
    QLineEdit* m_backupPath;
    QPushButton* m_browseBtn;
    QPushButton* m_backupBtn;
    QPushButton* m_restoreBtn;
    QPushButton* m_vacuumBtn;
    QPushButton* m_exportBtn;
    QProgressBar* m_progressBar;
    QTextEdit* m_logOutput;
};

} // namespace ClickFlash