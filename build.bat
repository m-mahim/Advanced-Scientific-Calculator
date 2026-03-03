@echo off
echo ========================================
echo    SCIENTIFIC CALCULATOR COMPILER
echo ========================================
echo.

echo Step 1: Checking for required tools...

:: Check if gcc is available
gcc --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: GCC compiler not found!
    echo Please install MinGW-w64 and add to PATH
    echo Download from: https://www.mingw-w64.org/
    pause
    exit /b 1
)

:: Check if flex is available
where win_flex >nul 2>&1
if errorlevel 1 (
    where flex >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Flex not found!
        echo Please download win_flex_bison from:
        echo https://github.com/lexxmark/winflexbison
        echo And place win_flex.exe in this folder
        pause
        exit /b 1
    ) else (
        set FLEX=flex
    )
) else (
    set FLEX=win_flex
)

:: Check if bison is available
where win_bison >nul 2>&1
if errorlevel 1 (
    where bison >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Bison not found!
        echo Please download win_flex_bison from:
        echo https://github.com/lexxmark/winflexbison
        echo And place win_bison.exe in this folder
        pause
        exit /b 1
    ) else (
        set BISON=bison
    )
) else (
    set BISON=win_bison
)

echo Tools found: GCC, %FLEX%, %BISON%
echo.

echo Step 2: Generating lexer (calculator.l -> lex.yy.c)...
%FLEX% calculator.l
if errorlevel 1 (
    echo ERROR: Flex compilation failed!
    echo Check calculator.l for syntax errors
    pause
    exit /b 1
)
echo ✓ Lexer generated successfully

echo Step 3: Generating parser (calculator.y -> calculator.tab.c, calculator.tab.h)...
%BISON% -d calculator.y
if errorlevel 1 (
    echo ERROR: Bison compilation failed!
    echo Common issues:
    echo 1. Syntax errors in calculator.y
    echo 2. Missing token definitions
    echo 3. Rule conflicts
    echo.
    echo Check the error messages above
    pause
    exit /b 1
)
echo ✓ Parser generated successfully

echo Step 4: Compiling final executable...
gcc -o calculator.exe lex.yy.c calculator.tab.c -lm
if errorlevel 1 (
    echo WARNING: Compilation with -lm failed, trying without...
    gcc -o calculator.exe lex.yy.c calculator.tab.c
    if errorlevel 1 (
        echo ERROR: Final compilation failed!
        echo.
        echo Troubleshooting:
        echo 1. Check if all generated files exist
        echo 2. Try manual compilation: gcc lex.yy.c calculator.tab.c
        pause
        exit /b 1
    )
)
echo ✓ Executable compiled successfully

echo.
echo ========================================
echo    BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Run 'calculator.exe' to start
echo Or use 'run.bat' to test immediately
echo.

pause