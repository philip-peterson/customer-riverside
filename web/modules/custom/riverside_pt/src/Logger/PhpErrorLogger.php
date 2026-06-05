<?php

namespace Drupal\riverside_pt\Logger;

use Drupal\Core\Logger\RfcLogLevel;
use Psr\Log\LoggerInterface;
use Psr\Log\LoggerTrait;

class PhpErrorLogger implements LoggerInterface {
  use LoggerTrait;

  private const LABELS = ['emergency', 'alert', 'critical', 'error', 'warning'];

  public function log($level, $message, array $context = []): void {
    if ($level > RfcLogLevel::WARNING) {
      return;
    }
    $channel = $context['channel'] ?? 'drupal';
    $severity = self::LABELS[$level] ?? 'unknown';
    $formatted = strtr($message, array_filter($context, 'is_scalar'));
    error_log(sprintf('[drupal/%s] %s: %s', $channel, strtoupper($severity), $formatted));
  }
}
