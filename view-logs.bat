@echo off
echo ========================================
echo VIDGRO APP - GOOGLE AUTH DEBUG LOGS
echo ========================================
echo.
echo Clearing previous logs...
adb logcat -c

echo Starting log capture...
echo Press Ctrl+C to stop
echo.
echo ----------------------------------------
adb logcat -s GOOGLE_AUTH_DEBUG:* GOOGLE_AUTH_ERROR:* GOOGLE_AUTH_WARN:* GOOGLE_AUTH_INFO:* ReactNativeJS:*
