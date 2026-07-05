#pragma once
#include <drogon/WebSocketController.h>
#include <memory>

class IpcController : public drogon::WebSocketController<IpcController>
{
public:
    virtual void handleNewMessage(const drogon::WebSocketConnectionPtr&,
                                  std::string &&,
                                  const drogon::WebSocketMessageType &) override;
    virtual void handleNewConnection(const drogon::HttpRequestPtr &,
                                     const drogon::WebSocketConnectionPtr&) override;
    virtual void handleConnectionClosed(const drogon::WebSocketConnectionPtr&) override;
    
    WS_PATH_LIST_BEGIN
    WS_PATH_ADD("/ipc");
    WS_PATH_LIST_END
};
