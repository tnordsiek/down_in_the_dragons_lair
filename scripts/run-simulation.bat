@echo off
setlocal
cd /d "%~dp0.."

call npm run simulate:pipeline -- --config=scripts/stress-input.csv --raw=scripts/stress-output-raw.csv --summary=scripts/stress-output-summary.csv --analysis=scripts/stress-analysis-summary.csv --report=scripts/stress-analysis-report.html
if errorlevel 1 goto :fail

echo Pipeline completed successfully.
echo Raw results: scripts/stress-output-raw.csv
echo Summary results: scripts/stress-output-summary.csv
echo Analysis summary: scripts/stress-analysis-summary.csv
echo HTML report: scripts/stress-analysis-report.html
goto :eof

:fail
echo Pipeline failed.
exit /b 1

endlocal
