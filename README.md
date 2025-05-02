# 内网服务器代理服务

这是一个用于连接内网服务器的代理服务。它通过WebSocket与主服务器通信，接收命令并在内网服务器上执行。

## 安装

```bash
npm install
```

## 配置

在运行之前，请先配置`.env`文件：

```
# 主服务器URL
SERVER_URL=http://your-server-url:3000
# 代理ID，必须唯一
PROXY_ID=proxy-1
# 重连延迟（毫秒）
RECONNECT_DELAY=5000
# API密钥，用于认证
API_KEY=your-api-key
```

## 运行

```bash
npm start
```

## 开发模式

```bash
npm run dev
```

## 工作原理

1. 代理服务连接到主服务器的WebSocket服务
2. 当收到命令执行请求时，代理服务使用SSH连接到目标服务器并执行命令
3. 命令执行结果通过WebSocket发送回主服务器

## 安全注意事项

- 确保API密钥足够复杂，并且只有授权的代理服务可以连接到主服务器
- 代理服务会存储服务器的密码和私钥，请确保代理服务运行在安全的环境中
- 考虑使用HTTPS连接到主服务器，以保护通信安全
