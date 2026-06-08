!macro customUninstall
  DetailPrint "Removing Windows Firewall rules for ClickFlash Touch..."
  nsExec::Exec 'netsh advfirewall firewall delete rule name="ClickFlash Touch - Backend (TCP 8091)"'
  nsExec::Exec 'netsh advfirewall firewall delete rule name="ClickFlash Touch - mDNS (UDP 5353)"'

  DetailPrint "Cleaning up ClickFlash Touch environment variables..."
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_DATA_DIR"
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_PORT"
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_TOUCH_MODE"

  DetailPrint "ClickFlash Touch post-uninstall complete."
!macroend
