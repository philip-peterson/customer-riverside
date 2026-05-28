<?php

namespace Drupal\riverside_pt\Commands;

use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drush\Attributes as CLI;
use Drush\Commands\DrushCommands;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Drush commands for Riverside PT site management.
 */
final class RiversidePtCommands extends DrushCommands implements ContainerInjectionInterface {

  public static function create(ContainerInterface $container): self {
    return new self();
  }

  /**
   * Rebuilds the entire Riverside PT site structure from code.
   *
   * This is the command used by the Docker entrypoint on every start
   * (unless DRUPAL_FAST=1 is passed).
   */
  #[CLI\Command(name: 'riverside:rebuild', aliases: ['rrb'])]
  #[CLI\Usage(name: 'drush riverside:rebuild', description: 'Rebuild content types, fields, roles, and navigation from code. Safe to run repeatedly.')]
  public function rebuild(): void {
    $this->output()->writeln('<info>Rebuilding Riverside PT site structure from code...</info>');

    // Make the helper functions from riverside_pt.install available.
    \Drupal::moduleHandler()->loadInclude('riverside_pt', 'install');

    if (!function_exists('_riverside_pt_rebuild')) {
      $this->logger()->error('Could not load _riverside_pt_rebuild().');
      return;
    }

    _riverside_pt_rebuild();

    $this->output()->writeln('<info>Rebuild complete.</info>');
    $this->logger()->success('Riverside PT structure has been rebuilt from code.');
  }
}
