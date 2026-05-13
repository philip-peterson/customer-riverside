<?php

/**
 * Seed provider_availability nodes for the next calendar month.
 *
 * Usage: drush php-script scripts/seed_availability.php
 *
 * Options (env vars):
 *   SEED_DRY_RUN=1   Print what would be created without saving.
 *   SEED_WIPE=1      Delete existing availability for the period first.
 */

$dryRun = (bool) getenv('SEED_DRY_RUN');
$wipe   = (bool) getenv('SEED_WIPE');

// --- Date range: next full calendar month ---
$start = new DateTimeImmutable('first day of next month 00:00:00');
$end   = new DateTimeImmutable('last day of next month 23:59:59');

// --- Load providers ---
$providerIds = \Drupal::entityQuery('user')
  ->condition('roles', 'provider')
  ->condition('status', 1)
  ->accessCheck(FALSE)
  ->execute();

if (empty($providerIds)) {
  echo "No active users with the 'provider' role found. Aborting.\n";
  return;
}

$providers = \Drupal\user\Entity\User::loadMultiple($providerIds);
echo sprintf("Found %d provider(s): %s\n",
  count($providers),
  implode(', ', array_map(fn($u) => $u->getDisplayName(), $providers))
);

// --- Optionally wipe existing availability in the range ---
if ($wipe) {
  $existing = \Drupal::entityQuery('node')
    ->condition('type', 'provider_availability')
    ->condition('field_start_datetime', $start->format('Y-m-d\TH:i:s'), '>=')
    ->condition('field_start_datetime', $end->format('Y-m-d\TH:i:s'), '<=')
    ->accessCheck(FALSE)
    ->execute();

  if ($existing) {
    echo sprintf("Deleting %d existing availability node(s)...\n", count($existing));
    if (!$dryRun) {
      $storage = \Drupal::entityTypeManager()->getStorage('node');
      $storage->delete($storage->loadMultiple($existing));
    }
  }
}

// --- Slot generation config ---
// Working hours: 8am–4pm (slots are 1 hour, last slot starts at 4pm)
const SLOT_DURATION_MINUTES = 60;
const SLOT_START_HOUR = 8;
const SLOT_END_HOUR   = 16;
const SLOT_HOURS      = [8, 9, 10, 11, 13, 14, 15, 16]; // skip noon

// Per-provider noise: each provider gets an independent random pattern.
// We use a seeded approach so the same provider always generates the same
// schedule for a given run, but differs from other providers.
function providerSeed(\Drupal\user\Entity\User $user): int {
  return crc32($user->getDisplayName() . $user->id());
}

function noisySlotCount(int $providerSeed, DateTimeImmutable $date): int {
  // Combine provider seed with day-of-year for per-day variance.
  $daySeed = $providerSeed ^ (int) $date->format('z') * 2654435761;
  // Map to 0–5, weighted toward 1–3.
  $raw = abs($daySeed) % 12;
  return [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5][$raw];
}

// --- Generate nodes ---
$created = 0;
$current = $start;

while ($current <= $end) {
  foreach ($providers as $provider) {
    $count = noisySlotCount(providerSeed($provider), $current);

    if ($count === 0) {
      $current = $current->modify('+1 day');
      continue 2;
    }

    // Pick $count distinct hours from SLOT_HOURS without replacement.
    $hours = SLOT_HOURS;
    shuffle($hours);
    $selectedHours = array_slice($hours, 0, $count);
    sort($selectedHours);

    foreach ($selectedHours as $hour) {
      $slotStart = $current->setTime($hour, 0);
      $slotEnd   = $slotStart->modify('+' . SLOT_DURATION_MINUTES . ' minutes');

      $label = sprintf('%s — %s',
        $provider->getDisplayName(),
        $slotStart->format('Y-m-d H:i')
      );

      if ($dryRun) {
        echo "[DRY RUN] Would create: $label\n";
      } else {
        \Drupal\node\Entity\Node::create([
          'type'               => 'provider_availability',
          'title'              => $label,
          'status'             => 1,
          'uid'                => 1,
          'field_provider'     => ['target_id' => $provider->id()],
          'field_start_datetime' => $slotStart->format('Y-m-d\TH:i:s'),
          'field_end_datetime'   => $slotEnd->format('Y-m-d\TH:i:s'),
        ])->save();
      }

      $created++;
    }
  }

  $current = $current->modify('+1 day');
}

$verb = $dryRun ? 'Would create' : 'Created';
echo sprintf("%s %d availability slot(s) across %d provider(s) for %s.\n",
  $verb,
  $created,
  count($providers),
  $start->format('F Y')
);
