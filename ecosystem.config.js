module.exports = {
  apps: [
    {
      name: "servbatch-proxy", // 应用名称
      script: "index.js", // 主程序文件
      instances: 1, // 实例数量
      autorestart: true, // 自动重启
      watch: false, // 不监视文件变化
      max_memory_restart: "1G", // 内存限制
      env: {
        NODE_ENV: "production",
        // 环境变量会从.env文件中加载
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/output.log",
      merge_logs: true,
    },
  ],
};
