@echo off
echo Starting Scientific Calculator...
echo.

:: Check if executable exists
if not exist calculator.exe (
    echo Calculator not compiled yet!
    echo Running build script first...
    call build.bat
    if errorlevel 1 (
        echo Build failed! Cannot run calculator.
        pause
        exit /b 1
    )
)

echo Launching Calculator...
echo.
calculator.exe