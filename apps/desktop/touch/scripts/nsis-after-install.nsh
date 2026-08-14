!macro customInstall
  DetailPrint "Configuring Windows Firewall for ClickFlash Touch..."
  nsExec::Exec 'netsh advfirewall firewall add rule name="ClickFlash Touch - Backend (TCP 8091)" dir=in action=allow protocol=TCP localport=8091'
  nsExec::Exec 'netsh advfirewall firewall add rule name="ClickFlash Touch - mDNS (UDP 5353)" dir=in action=allow protocol=UDP localport=5353'
  nsExec::Exec 'netsh advfirewall firewall add rule name="ClickFlash Touch - mDNS (UDP 5353)" dir=out action=allow protocol=UDP localport=5353'

  DetailPrint "Creating ClickFlash Touch data directories..."
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\pb_data"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\storage"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\logs"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\temp"

  DetailPrint "Setting default environment variables..."
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_DATA_DIR" "$LOCALAPPDATA\ClickFlash\Touch"
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_PORT" "8091"
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_MODE" "production"

  DetailPrint "ClickFlash Touch post-install complete."
!macroend
