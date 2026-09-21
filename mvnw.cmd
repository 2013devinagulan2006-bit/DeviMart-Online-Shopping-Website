@echo off
setlocal
set ERROR_CODE=0

if "%JAVA_HOME%"=="" (
    for /f "delims=" %%i in ('where java 2^>nul') do (
        set "JAVA_PATH=%%i"
        goto foundJava
    )
) else (
    if exist "%JAVA_HOME%\bin\java.exe" (
        set "JAVA_PATH=%JAVA_HOME%\bin\java.exe"
        goto foundJava
    )
)

echo Error: Could not locate Java. Please set JAVA_HOME. >&2
set ERROR_CODE=1
goto error

:foundJava
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR%"=="" set "PROJECT_DIR=%CD%\"

python "%PROJECT_DIR%.mvn\wrapper\download.py"
if %ERRORLEVEL% neq 0 (
    set ERROR_CODE=1
    goto error
)

set "MVN_CMD=%PROJECT_DIR%.mvn\wrapper\apache-maven-3.9.6\bin\mvn.cmd"
call "%MVN_CMD%" -f "%PROJECT_DIR%pom.xml" %*
set ERROR_CODE=%ERRORLEVEL%

:error
exit /b %ERROR_CODE%
