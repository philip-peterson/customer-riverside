<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ScheduleController extends ControllerBase {

  public function page(): array {
    return [
      '#type' => 'html_tag',
      '#tag' => 'div',
      '#attributes' => ['id' => 'riverside-calendar'],
      '#attached' => [
        'library' => ['riverside_pt/schedule'],
        'drupalSettings' => [
          'riversidePt' => [
            'eventsUrl' => Url::fromRoute('riverside_pt.schedule_events')->toString(),
          ],
        ],
      ],
    ];
  }

  public function events(Request $request): JsonResponse {
    $start = $request->query->get('start');
    $end = $request->query->get('end');

    $query = \Drupal::entityQuery('node')
      ->condition('type', 'provider_availability')
      ->condition('status', 1)
      ->accessCheck(TRUE);

    if ($start) {
      $query->condition('field_end_datetime', $start, '>=');
    }
    if ($end) {
      $query->condition('field_start_datetime', $end, '<=');
    }

    $nids = $query->execute();
    $nodes = Node::loadMultiple($nids);

    $events = array_map(fn(Node $node) => [
      'id' => $node->id(),
      'title' => $node->field_provider->entity?->getDisplayName() ?? 'Provider',
      'start' => $node->field_start_datetime->value,
      'end' => $node->field_end_datetime->value,
    ], $nodes);

    return new JsonResponse(array_values($events));
  }

}
