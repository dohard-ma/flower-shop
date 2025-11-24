import { formatDate } from './dt';

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m', // error
  green: '\x1b[32m', // success
  yellow: '\x1b[33m', // warn
  blue: '\x1b[34m', // debug
  cyan: '\x1b[36m', // info
  gray: '\x1b[90m'
};

// 检查是否在 pm2 环境下运行
const isPM2 = typeof process.env.PM2_HOME !== 'undefined';

type LogData = Record<string, unknown>;

export class Logger {
  private static formatMessage(
    traceId: string,
    message: string,
    data?: LogData
  ) {
    let datastr = data ? JSON.stringify(data) : '';
    // datastr = datastr.slice(0, 100);
    const timestamp = isPM2 ? '' : `[${formatDate(new Date().getTime())}] `;
    return `${timestamp}traceId=${traceId}, ${message} ${datastr}`;
  }

  private static colorize(color: keyof typeof colors, text: string): string {
    return isPM2 ? text : `${colors[color]}${text}${colors.reset}`;
  }

  static info(traceId: string, message: string, data?: LogData) {
    const logData = this.formatMessage(traceId, message, data);
    console.log(this.colorize('cyan', logData));
  }

  static success(traceId: string, message: string, data?: LogData) {
    const logData = this.formatMessage(traceId, message, data);
    console.log(this.colorize('green', logData));
  }

  static error(traceId: string, message: string, data?: LogData) {
    const logData = this.formatMessage(traceId, message, data);
    console.error(this.colorize('red', logData));
  }

  static warn(traceId: string, message: string, data?: LogData) {
    const logData = this.formatMessage(traceId, message, data);
    console.warn(this.colorize('yellow', logData));
  }

  static debug(traceId: string, message: string, data?: LogData) {
    // 只在开发环境输出 debug 日志
    if (process.env.NODE_ENV === 'development') {
      const logData = this.formatMessage(traceId, message, data);
      console.debug(this.colorize('blue', logData));
    }
  }
}
