import { createConsola, LogLevels } from 'consola';

/**
 * Central logger for Alif. Configure once at startup via `configureLogger()`.
 * Everywhere else: just import and call logger.info / logger.success / etc.
 */
export const logger = createConsola({
  level: LogLevels.info,
});

export type LogLevel = 'silent' | 'normal' | 'verbose';

/**
 * Apply the user's preferred log level and color settings.
 * Call this as early as possible in each entry point (run, schedule, debug…).
 */
export function configureLogger(opts: {
  level?: LogLevel;
  noColor?: boolean;
  /** Per-run override: --verbose / --quiet flag */
  override?: 'verbose' | 'quiet';
}): void {
  // Per-run flags win over persisted config
  const effective =
    opts.override === 'verbose'
      ? 'verbose'
      : opts.override === 'quiet'
        ? 'silent'
        : (opts.level ?? 'normal');

  switch (effective) {
    case 'silent':
      logger.level = LogLevels.error;
      break;
    case 'verbose':
      logger.level = LogLevels.debug;
      break;
    default:
      logger.level = LogLevels.info;
  }

  if (opts.noColor) {
    // Disable ANSI colors using consola's formatOptions API
    logger.options.formatOptions = {
      ...logger.options.formatOptions,
      colors: false,
    };
    // Also set NO_COLOR so child processes and other libraries respect it
    process.env.NO_COLOR = '1';
  }
}
