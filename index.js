const { io } = require("socket.io-client");
const { NodeSSH } = require("node-ssh");
const dotenv = require("dotenv");

// 加载环境变量
dotenv.config();

// 配置
const config = {
  serverUrl: process.env.SERVER_URL || "http://localhost:3000",
  proxyId: process.env.PROXY_ID || "proxy-1",
  reconnectDelay: parseInt(process.env.RECONNECT_DELAY || "5000"),
  apiKey: process.env.API_KEY || "your-api-key",
};

// SSH连接池
const sshConnections = new Map();

// 连接到主服务器
function connectToServer() {
  console.log(`正在连接到服务器: ${config.serverUrl}`);

  const socket = io(`${config.serverUrl}/proxy`, {
    query: {
      proxyId: config.proxyId,
      apiKey: config.apiKey,
    },
    reconnection: true,
    reconnectionDelay: config.reconnectDelay,
    reconnectionAttempts: Infinity,
  });

  // 连接事件
  socket.on("connect", () => {
    console.log("已连接到服务器");
  });

  // 断开连接事件
  socket.on("disconnect", (reason) => {
    console.log(`与服务器断开连接: ${reason}`);
  });

  // 重连事件
  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`尝试重新连接 (${attemptNumber})`);
  });

  // 错误事件
  socket.on("error", (error) => {
    console.error("连接错误:", error);
  });

  // 处理执行命令请求
  socket.on("execute_command", async (data) => {
    console.log(`收到命令执行请求: ${JSON.stringify(data)}`);

    try {
      const result = await executeCommand(data);
      socket.emit("command_result", {
        commandId: data.commandId,
        result,
      });
    } catch (error) {
      console.error(`执行命令失败: ${error.message}`);
      socket.emit("command_result", {
        commandId: data.commandId,
        result: {
          stdout: "",
          stderr: error.message,
          exitCode: 1,
        },
      });
    }
  });

  return socket;
}

// 执行SSH命令
async function executeCommand(data) {
  const {
    serverId,
    host,
    port,
    username,
    password,
    privateKey,
    command,
    timeout,
  } = data;

  // 获取或创建SSH连接
  let ssh = sshConnections.get(serverId);
  if (!ssh) {
    ssh = new NodeSSH();

    // 创建SSH配置
    const config = {
      host,
      port,
      username,
    };

    // 设置认证方式
    if (password) {
      config.password = password;
    } else if (privateKey) {
      config.privateKey = privateKey;
    } else {
      throw new Error("未提供密码或私钥");
    }

    // 连接到服务器
    try {
      await ssh.connect(config);
      sshConnections.set(serverId, ssh);
      console.log(`已连接到服务器 ${host}:${port}`);
    } catch (error) {
      throw new Error(`无法连接到服务器: ${error.message}`);
    }
  }

  // 执行命令
  try {
    const options = {
      cwd: "/",
    };

    // 如果提供了超时时间，添加自定义处理
    let timeoutId;
    const executePromise = ssh.execCommand(command, options);

    if (timeout) {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`命令执行超时 (${timeout}ms)`));
        }, timeout);
      });

      // 使用Promise.race来实现超时
      const result = await Promise.race([executePromise, timeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code || 0,
      };
    } else {
      const result = await executePromise;

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code || 0,
      };
    }
  } catch (error) {
    console.error(`执行命令失败: ${error.message}`);
    return {
      stdout: "",
      stderr: error.message,
      exitCode: 1,
    };
  }
}

// 关闭所有SSH连接
function closeAllConnections() {
  for (const [serverId, ssh] of sshConnections.entries()) {
    ssh.dispose();
    sshConnections.delete(serverId);
    console.log(`已关闭服务器 ${serverId} 的连接`);
  }
}

// 处理进程退出
process.on("SIGINT", () => {
  console.log("正在关闭...");
  closeAllConnections();
  process.exit(0);
});

// 启动代理服务
connectToServer();
console.log(`代理服务已启动，ID: ${config.proxyId}`);
