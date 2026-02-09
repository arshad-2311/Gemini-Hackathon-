@echo off
REM How2Sign Dataset Download Script for Windows
REM Run this script from the backend folder

echo Creating directory structure...
if not exist "how2sign_data\clips" mkdir "how2sign_data\clips"
if not exist "how2sign_data\keypoints" mkdir "how2sign_data\keypoints"
if not exist "how2sign_data\translations" mkdir "how2sign_data\translations"

echo.
echo ========================================
echo HOW2SIGN DATASET DOWNLOAD
echo ========================================
echo.
echo Please download the following files manually:
echo.
echo 1. TRANSLATIONS (small ~2MB):
echo    https://drive.google.com/uc?export=download^&id=1lq7ksWeD3FzaIwowRbe_BvCmSmOG12-f
echo    Save as: how2sign_data\translations\train.json
echo.
echo 2. KEYPOINTS (OpenPose format ~500MB):
echo    https://drive.google.com/uc?export=download^&id=1TBX7hLraMiiLucknM1mhblNVomO9-Y0r
echo    Save as: how2sign_data\keypoints\train_keypoints.tar.gz
echo.
echo 3. (OPTIONAL) RGB Video Clips:
echo    Front view: ~31GB
echo    Side view: ~22GB
echo    Only download if needed for demo visuals
echo.
echo ========================================
echo After downloading, run:
echo   tar -xzf how2sign_data\keypoints\train_keypoints.tar.gz -C how2sign_data\keypoints
echo ========================================

pause
