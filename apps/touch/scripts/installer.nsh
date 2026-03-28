!macro customInstall
  DetailPrint "Configuring Windows Firewall..."
  nsExec::Exec 'netsh advfirewall firewall add rule name="Star Master Touch Port 8092" dir=in action=allow protocol=TCP localport=8092'
!macroend

!macro customUninstall
  DetailPrint "Removing Firewall Rules..."
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Star Master Touch Port 8092"'
!macroend
