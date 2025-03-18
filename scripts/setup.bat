@echo off
setlocal EnableDelayedExpansion

:: 检查 Node.js 是否安装
node -v >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Node.js 未安装，请手动安装 Node.js（https://nodejs.org/）
    echo 建议下载 LTS 版本
    start https://nodejs.org/en/download/
    pause
    echo 请安装 Node.js 后重新运行此脚本
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
    echo Node.js !NODE_VER! 已安装
)

:: 检查 npm 是否安装
npm -v >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo npm 未安装，这不应该发生（通常随 Node.js 安装）
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
    echo npm !NPM_VER! 已安装
)

:: 如果有 package.json，安装 Node.js 依赖
if exist package.json (
    echo 检测到 package.json，正在安装 Node.js 依赖...
    npm install
) else (
    echo 未找到 package.json，未安装额外的 Node.js 依赖
)

echo 所有依赖安装完成！
pause