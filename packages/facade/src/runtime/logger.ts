export type LogValue = string | number | boolean | undefined;
export type LogContext = Readonly<Record<string, LogValue>> & { readonly level?: never; readonly message?: never };
export type LogLevel = 'info' | 'warn' | 'error';
export type LogSink = (line: string) => void;

export function createLogger(write: LogSink) {
  return {
    info(context: LogContext, message: string) { write(format('info', context, message)); },
    warn(context: LogContext, message: string) { write(format('warn', context, message)); },
    error(context: LogContext, message: string) { write(format('error', context, message)); },
  };
}

function format(level: LogLevel, context: LogContext, message: string): string {
  return JSON.stringify({ ...omitUndefined(context), level, message });
}

function omitUndefined(context: LogContext): Record<string, Exclude<LogValue, undefined>> {
  const safeContext: Record<string, Exclude<LogValue, undefined>> = {};
  for (const [key, value] of Object.entries(context)) {
    if (key !== 'level' && key !== 'message' && value !== undefined) safeContext[key] = value;
  }
  return safeContext;
}
