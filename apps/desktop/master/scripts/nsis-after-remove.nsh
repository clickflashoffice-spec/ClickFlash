!macro customUninstall
  DetailPrint "Removing Windows Firewall rules for ClickFlash Master..."
  nsExec::Exec 'netsh advfirewall firewall delete rule name="ClickFlash Master - Backend (TCP 8090)"'
  nsExec::Exec 'netsh advfirewall firewall delete rule name="ClickFlash Master - Touch Backend (TCP 8091)"'
  nsExec::Exec 'netsh advfirewall firewall delete rule name="ClickFlash Master - mDNS (UDP 5353)"'

  DetailPrint "Cleaning up ClickFlash Master environment variables..."
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_DATA_DIR"
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_PORT"
  DeleteRegValue HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "CLICKFLASH_MASTER_MODE"

  DetailPrint "ClickFlash Master post-uninstall complete."
!macroend
