@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

where magick >nul 2>nul
if errorlevel 1 (
  echo [ERROR] ImageMagick wurde nicht gefunden. Bitte ^`magick^` in PATH verfuegbar machen.
  exit /b 1
)

magick -list format | findstr /c:"WEBP      rw+" >nul
if errorlevel 1 (
  echo [ERROR] Die lokale ImageMagick-Installation kann WEBP nicht lesen^/schreiben.
  echo [ERROR] Pruefe ^`magick -list format^` und installiere einen Build mit WEBP-Delegate.
  exit /b 1
)

set "FAILED=0"
set "PROCESSED=0"

call :convertGroup "public\assets\tiles" "tile_*.png" "512x512>" "90"
call :convertGroup "public\assets\heroes" "token_*.png" "512x512>" "88"
call :convertGroup "public\assets\monsters" "token_*.png" "512x512>" "88"
call :convertGroup "public\assets\items" "*.png" "256x256>" "86"
call :convertGroup "public\assets\status" "*.png" "256x256>" "86"
call :convertGroup "public\assets\ui" "ui_dice_0*.png" "320x320>" "88"
call :convertGroup "public\assets\ui" "ui_logo_wordmark.png" "768x768>" "90"
call :convertGroup "public\assets\ui" "ui_logo_header.png" "1200x1200>" "90"

if not "%FAILED%"=="0" (
  echo [ERROR] Mindestens eine Konvertierung ist fehlgeschlagen.
  exit /b 1
)

echo [DONE] %PROCESSED% Dateien erfolgreich nach WEBP konvertiert.
exit /b 0

:convertGroup
set "GROUP_DIR=%~1"
set "GROUP_PATTERN=%~2"
set "GROUP_RESIZE=%~3"
set "GROUP_QUALITY=%~4"

echo [GROUP] %GROUP_DIR%\%GROUP_PATTERN%

set "MATCHED=0"
for %%F in ("%GROUP_DIR%\%GROUP_PATTERN%") do (
  if exist "%%~fF" (
    set "MATCHED=1"
    call :convertOne "%%~fF" "%GROUP_RESIZE%" "%GROUP_QUALITY%"
    if errorlevel 1 exit /b 1
  )
)

if "!MATCHED!"=="0" (
  echo [WARN] Keine Dateien fuer %GROUP_DIR%\%GROUP_PATTERN% gefunden.
)

exit /b 0

:convertOne
set "SRC=%~1"
set "RESIZE=%~2"
set "QUALITY=%~3"
set "DST=%~dpn1.webp"
set "TMP=%DST%.tmp.webp"

echo [FILE] %SRC%
if exist "%TMP%" del /f /q "%TMP%" >nul 2>nul

magick "%SRC%" ^
  -resize "%RESIZE%" ^
  -quality "%QUALITY%" ^
  -define webp:method=6 ^
  -define webp:thread-level=1 ^
  -define webp:sns-strength=80 ^
  -define webp:filter-strength=35 ^
  -define webp:filter-sharpness=4 ^
  "%TMP%"

if errorlevel 1 (
  echo [ERROR] Konvertierung fehlgeschlagen: %SRC%
  if exist "%TMP%" del /f /q "%TMP%" >nul 2>nul
  set "FAILED=1"
  exit /b 1
)

move /y "%TMP%" "%DST%" >nul
if errorlevel 1 (
  echo [ERROR] Konnte Zieldatei nicht schreiben: %DST%
  if exist "%TMP%" del /f /q "%TMP%" >nul 2>nul
  set "FAILED=1"
  exit /b 1
)

del /f /q "%SRC%" >nul
if errorlevel 1 (
  echo [ERROR] Originaldatei konnte nicht entfernt werden: %SRC%
  set "FAILED=1"
  exit /b 1
)

set /a PROCESSED+=1
exit /b 0
