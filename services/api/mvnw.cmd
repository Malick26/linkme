@REM Maven Wrapper minimal pour Windows : telecharge Maven une fois puis l execute.
@echo off
setlocal
set "BASEDIR=%~dp0"
for /f "usebackq tokens=1,* delims==" %%A in ("%BASEDIR%.mvn\wrapper\maven-wrapper.properties") do if "%%A"=="distributionUrl" set "URL=%%B"
for %%F in ("%URL%") do set "ZIP=%%~nF"
set "NAME=%ZIP:-bin=%"
if "%MAVEN_USER_HOME%"=="" set "MAVEN_USER_HOME=%USERPROFILE%\.m2"
set "DEST=%MAVEN_USER_HOME%\wrapper\dists\%NAME%"
if not exist "%DEST%\%NAME%\bin\mvn.cmd" (
  echo Telechargement de %NAME%...
  mkdir "%DEST%" 2>nul
  powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%DEST%\dist.zip'; Expand-Archive -Force '%DEST%\dist.zip' '%DEST%'; Remove-Item '%DEST%\dist.zip'"
)
"%DEST%\%NAME%\bin\mvn.cmd" -f "%BASEDIR%pom.xml" %*
