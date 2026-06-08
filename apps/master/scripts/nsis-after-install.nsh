!macro customInstall
  DetailPrint "Configuring Windows Firewall for ClickFlash Master..."
  nsExec::Exec 'netsh advfirewall firewall add rule name="ClickFlash Master - Backend (TCP 8090)" dir=in action=allow protocol=TCP localport=8090'
  nsExec::Exec 'netsh advfirewall firewall add rule name="ClickFlash Master - Touch Backend (TCP 8091)" dir=in action=allow protocol=TCP localport=8091'
  nsExec::Exec 'netsh advfirewall firewall add rule name="ClickFlash Master - mDNS (UDP 5353)" dir=in action=allow protocol=UDP localport=5353'
  nsExec::Exec 'netsh advfirewall firewall add rule name="ClickFlash Master - mDNS (UDP 5353)" dir=out action=allow protocol=UDP localport=5353'

  DetailPrint "Creating ClickFlash Master data directories..."
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\pb_data"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\storage"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\logs"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\backups"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\temp"

  DetailPrint "Setting default environment variables..."
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_DATA_DIR" "$LOCALAPPDATA\ClickFlash\Master"
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_PORT" "8090"
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_MODE" "production"

  DetailPrint "ClickFlash Master post-install complete."
!macroend
