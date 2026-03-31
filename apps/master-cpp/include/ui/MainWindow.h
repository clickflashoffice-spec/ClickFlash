#pragma once

#include <string>
#include <memory>
#include <functional>

namespace ClickFlash {

class MainWindow {
public:
    MainWindow();
    ~MainWindow();

    void show();
    void hide();
    void close();

    void setTitle(const std::string& title);
    std::string getTitle() const { return title_; }

    void showNotification(const std::string& message);
    void showError(const std::string& error);
    void showSuccess(const std::string& message);

    bool isVisible() const { return visible_; }

private:
    std::string title_;
    bool visible_;
    int width_;
    int height_;
};

}