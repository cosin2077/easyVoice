#!/bin/bash

# 设置退出脚本如果有任何命令失败
set -e

# 检查是否已安装 Python
if ! command -v python3 &> /dev/null; then
    echo "Python3 未安装，请先安装 Python3"
    exit 1
else
    echo "Python3 已安装，版本为: $(python3 --version)"
fi

# 检查是否已安装 pip
if ! command -v pip3 &> /dev/null; then
    echo "pip3 未安装，正在安装..."
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    python3 get-pip.py
    rm get-pip.py
else
    echo "pip3 已安装，版本为: $(pip3 --version)"
fi

# 安装 edge-tts
echo "正在安装 edge-tts..."
pip3 install edge-tts

# 检查是否已安装 Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js 未安装，正在安装..."
    # 使用 nvm 安装最新 LTS 版本的 Node.js
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # 加载 nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    # 安装 Node.js LTS 版本
    nvm install --lts
    nvm use --lts
else
    echo "Node.js 已安装，版本为: $(node -v)"
fi

# 检查是否已安装 npm
if ! command -v npm &> /dev/null; then
    echo "npm 未安装，这不应该发生（通常随 Node.js 安装）"
    exit 1
else
    echo "npm 已安装，版本为: $(npm -v)"
fi

# 如果有 Node.js 依赖，在 package.json 中定义，然后安装
if [ -f "package.json" ]; then
    echo "检测到 package.json，正在安装 Node.js 依赖..."
    npm install
else
    echo "未找到 package.json，未安装额外的 Node.js 依赖"
fi

echo "所有依赖安装完成！"