export type LogContext = Readonly<Record<string, string | number | boolean | undefined>>;
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
  return JSON.stringify({ level, ...omitUndefined(context), message });
}

function omitUndefined(context: LogContext): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(context).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined));
}
