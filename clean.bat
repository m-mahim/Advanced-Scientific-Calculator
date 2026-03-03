@echo off
echo Cleaning build files...

del calculator.exe 2>nul
del lex.yy.c 2>nul
del calculator.tab.c 2>nul
del calculator.tab.h 2>nul
del *.o 2>nul

echo ✓ Clean completed!
echo.
pause