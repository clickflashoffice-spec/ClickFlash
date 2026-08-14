!include "MUI2.nsh"

Name "ClickFlash Desktop Suite"
OutFile "ClickFlash-Setup.exe"
InstallDir "$PROGRAMFILES\ClickFlash"
RequestExecutionLevel admin

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "Desktop Apps" SecDesktop
  SetOutPath "$INSTDIR"
  
  # Include binaries
  File /r "..\master\release\win-unpacked\*.*"
  File /r "..\touch\release\win-unpacked\*.*"

  # Create shortcuts
  CreateDirectory "$SMPROGRAMS\ClickFlash"
  CreateShortcut "$SMPROGRAMS\ClickFlash\Master.lnk" "$INSTDIR\ClickFlashMaster.exe"
  CreateShortcut "$SMPROGRAMS\ClickFlash\Touch Kiosk.lnk" "$INSTDIR\ClickFlashTouch.exe"

  # Add Firewall Exceptions for LAN Sync
  ExecWait 'netsh advfirewall firewall add rule name="ClickFlash Master LAN" dir=in action=allow protocol=TCP localport=8090'
  ExecWait 'netsh advfirewall firewall add rule name="ClickFlash Touch LAN" dir=in action=allow protocol=TCP localport=5174'
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\*.*"
  RMDir "$INSTDIR"
  
  Delete "$SMPROGRAMS\ClickFlash\*.*"
  RMDir "$SMPROGRAMS\ClickFlash"
  
  # Remove Firewall Exceptions
  ExecWait 'netsh advfirewall firewall delete rule name="ClickFlash Master LAN"'
  ExecWait 'netsh advfirewall firewall delete rule name="ClickFlash Touch LAN"'
SectionEnd
