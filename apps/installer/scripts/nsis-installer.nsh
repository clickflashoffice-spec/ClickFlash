!macro customInstall
  DetailPrint "Configuring ClickFlash Studio..."

  ; Create data directories
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\pb_data"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\pb_data\uploads"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\pb_data\trash_archive"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\logs"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Master\backups"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\pb_data"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\pb_data\uploads"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\pb_data\orders"
  CreateDirectory "$LOCALAPPDATA\ClickFlash\Touch\logs"

  ; Set registry environment variables
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_DATA_DIR" "$LOCALAPPDATA\ClickFlash\Master\pb_data"
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_DATA_DIR" "$LOCALAPPDATA\ClickFlash\Touch\pb_data"
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_PORT" "8090"
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_PORT" "8091"

  ; Open Windows Firewall for ClickFlash ports
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ClickFlash Master" dir=in action=allow protocol=tcp localport=8090'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ClickFlash Touch" dir=in action=allow protocol=tcp localport=8091'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ClickFlash mDNS" dir=in action=allow protocol=udp localport=5353'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ClickFlash Master Out" dir=out action=allow protocol=tcp localport=8090'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ClickFlash Touch Out" dir=out action=allow protocol=tcp localport=8091'

  ; Refresh environment
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000

  DetailPrint "ClickFlash Studio configured successfully."
!macroend

!macro customUnInstall
  DetailPrint "Removing ClickFlash configuration..."

  ; Remove firewall rules
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ClickFlash Master"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ClickFlash Touch"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ClickFlash mDNS"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ClickFlash Master Out"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ClickFlash Touch Out"'

  ; Remove registry entries
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_DATA_DIR"
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_DATA_DIR"
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_PORT"
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_PORT"

  ; Ask to preserve data
  MessageBox MB_YESNO|MB_ICONQUESTION "Preserve photo data and studio configuration? Select YES to keep your photos, orders, and settings. Select NO to delete all data." IDYES preserve_data
  RMDir /r "$LOCALAPPDATA\ClickFlash"
  preserve_data:

  DetailPrint "ClickFlash removed."
!macroend
